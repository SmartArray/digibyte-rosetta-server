const EventEmitter = require('events');
const level = require('level');
const JSBinType = require('js-binary').Type;

const syncBlockCache = require('./syncBlockCache');

const BLOCK_BATCH_SIZE = 200;
const TX_BATCH_SIZE = 20000;
const ADDRESS_BATCH_SIZE = 20000;
const SATOSHI = 100000000;

const SymbolSchema = new JSBinType({
  'symbol': 'uint',
});

const UtxoValueSchema = new JSBinType({
  'sats': 'float',
  'address?': 'uint',
  'createdOnBlock': 'uint',
  'spentOnBlock?': 'uint',
  'spentInTx?': 'uint',
});

const UtxoKeySchema = new JSBinType({
  'txSymbol': 'uint',
  'n': 'uint',
});

const AddressValueSchema = new JSBinType({
  'txSymbol': ['uint'],
  'vout': ['uint'],
  'address?': 'string',
});

const EMPTY_UTXO_LIST = AddressValueSchema.encode({
  'txSymbol': [],
  'vout': [],
});

const PREFIX_BLOCK_SYM = 'B';
const PREFIX_SYM_BLOCK = 'b';
const PREFIX_TX_SYM = 'T';
const PREFIX_UTXO = 'U';
const PREFIX_ADDRESS_UTXOS = 'X';
const PREFIX_ADDRESS_SYM = 'A';

const VALID_PREFIXES = [
  PREFIX_BLOCK_SYM,
  PREFIX_TX_SYM,
  PREFIX_UTXO,
  PREFIX_ADDRESS_UTXOS,
  PREFIX_ADDRESS_SYM,
  PREFIX_SYM_BLOCK,
];

const convertToSatoshis = (value) => {
  const ret = Math.round(value * SATOSHI); // ok because we want whole numbers
  return ret;
};

const encodeSymbol = (symbol) => SymbolSchema.encode({ symbol });

const decodeSymbol = (buffer) => {
  const decoded = SymbolSchema.decode(buffer);
  return parseInt(decoded.symbol);
};

const returnSymbol = (symbol) => {
  if (symbol == null) return null;
  if (Buffer.isBuffer(symbol)) return decodeSymbol(symbol);
  if (typeof symbol === 'number') return symbol;
  return parseInt(symbol);
};

const hexToBin = (hexString) => {
  if (typeof hexString !== 'string' || hexString.length == 0) {
    throw new Error(`No valid string: ${hexString}`);
  }

  const ret = Buffer.from(hexString, 'hex');
  return ret;
};

const binToHex = (binary) => {
  if (typeof binary !== 'object' || !Buffer.isBuffer(binary)) {
    throw new Error(`No valid binary: ${binary}`);
  }

  return binary.toString('hex');
}

const serializeAddress = (address) => address;
const deserializeAddress = (serializedAddress) => serializedAddress;

class DatabaseWrapper {
  constructor(dbInstance, namespace, prefix) {
    this.dbInstance = dbInstance;
    this.namespace = namespace;
    this.prefix = prefix;
  }

  _prefixKey(data) {
    const type = this.prefix;

    if (type == null) throw new Error('Type must not be null');
    if (!VALID_PREFIXES.includes(type)) throw new Error(`Type must be one of ${VALID_PREFIXES}, found ${type}`);
    if (!data) throw new Error(`Data ${data} is invalid`);

    if (Buffer.isBuffer(data)) {
      return Buffer.concat([Buffer.from(type), data]);

    } else if (typeof data === 'string') {
      return `${type}${data}`;
    }

    throw new Error(`Unsupported datatype ${typeof data}, found: ${data}`);
  }

  async get(key) {
    const prefixedKey = this._prefixKey(key);
    return await this.dbInstance.get(prefixedKey);
  }

  async del(key) {
    const prefixedKey = this._prefixKey(key);
    return await this.dbInstance.del(prefixedKey);
  }

  async put(key, value) {
    const prefixedKey = this._prefixKey(key);
    return await this.dbInstance.put(prefixedKey, value);
  }

  process(operation) {
    operation.key = this._prefixKey(operation.key);
    return operation;
  }

  processList(operations = []) {
    // We do not create a copy of the operations to improve efficiency.
    const prefixedOperations = operations.map(this.process.bind(this));

    return prefixedOperations;
  }

  // async batch(operations = []) {
  //   const prefixedOperations = this.processList(operations);

  //   console.log(typeof operations, typeof prefixedOperations)
  //   return await this.dbInstance.batch(prefixedOperations);
  // }
}

class Indexer {
  constructor(config = {}) {
    if (typeof config.path !== 'string' || config.path.length == 0) {
      throw new Error('DB path not valid');
    }

    this.path = config.path;
    this.db = {};
    this._db = null;

    this.genesisBlockHash = undefined;
    this.bestBlockHash = undefined;
    this.lastBlockSymbol = undefined;
    this.lastTxSymbol = undefined;
    this.lastAddressSymbol = undefined;
    this.safeLastBlockSymbol = undefined;

    this.genesisBlockHashUpdated = false;

    this.workQueue = [];
    this.dbBatches = {};
    this.workerActive = false;

    this.lastSeenBlockHashes = {};
    this.lastSeenTxHashes = {};
    this.lastSeenAddresses = {}; // 'address' -> 'address symbol'
    this.lastSeenUtxos = {};
    this.lastAddressUtxos = {};

    this.events = new EventEmitter();
  }

  createDatabase() {
    const options = {
      valueEncoding: 'binary',
      keyEncoding: 'binary',
    };

    const name = 'utxo';
    this._db = level(`${this.path}/${name}`, options);
  }

  createDatabaseInfo(key, type) {
    this.dbBatches[key] = []; // ops

    this.db[key] = new DatabaseWrapper(this._db, key, type);
  }

  saveState() {
    return new Promise((fulfill, reject) => {
      if (this.workerActive) {
        // Wait for worker to finish
        const handler = async () => {
          await this.processBatches();
          this.events.removeListener('worker:quit', handler);
          fulfill();
        };

        this.events.on('worker:quit', handler);
        return;
      }

      this.processBatches()
        .then(fulfill)
        .catch(reject);
    });
  }

  handleBlock(block, removed = false) {
    let blockHash;

    if (removed) {
      // Block removed
      const { hash, index } = block;
      blockHash = hash;
    } else {
      // Block added
      blockHash = block.block_identifier.hash;
    }

    const blockData = syncBlockCache.get(blockHash);

    if (!blockData) {
      throw new Error(`CRITICAL: No data found in SyncBlockCache for ${blockHash}`);
    }

    /**
     * Mark the black as "to be removed"
     */
    blockData.remove = removed;

    this.workQueue.push(blockData);
    this.worker();
  }

  async worker() {
    if (this.workerActive || this.workQueue.length == 0) return;
    this.workerActive = true;

    try {
      while (this.workQueue.length > 0) {
        const block = this.workQueue.shift();

        if (this.genesisBlockHash == null) {
          // Expect a genesis block

          if (block.height == 0) {
            // Remember the genesisBlockHash
            this.genesisBlockHash = block.hash;
            this.genesisBlockHashUpdated = true;
          } else {
            throw new Error('CRITICAL: No Genesis Block was passed to Indexer.');
          }
        }

        const blockExists = await this.getBlockSymbol(block.hash);
        const previousBlockHash = block.previousblockhash;
        const previousBlockSymbol = await this.getBlockSymbol(previousBlockHash);

        if (block.remove) {
          /**
           * Block will me removed from the utxo database (REORG)
           */
          if (blockExists == null) {
            throw new Error(`Cannot remove block with hash ${block.hash} `
              + `because the symbol does not exist`);
          }

          // Exit if the previous block does not exist.
          // This should never happen, but we need the block symbol
          // in order to reset the lastBlockSymbol.
          if (previousBlockSymbol == null && block.height != 0) {
            throw new Error(`Cannot remove block with hash ${block.hash} `
              + `because the symbol of the previous block hash ${previousBlockHash} `
              + `does not exist`);            
          }

          console.log(`Removing block ${block.hash} due to reorg...`);  

          // Flush evereything to disk before we remove the 
          // affected data.
          await this.processBatches();

          // Remove
          await this.removeBlock(block);

          // Update the internal state
          this.lastBlockSymbol = previousBlockSymbol;
          this.bestBlockHash = previousBlockHash;
          this.safeLastBlockSymbol = this.lastBlockSymbol;

          // Commit updates
          await this.processBatches();
          console.log('Done!');

        } else {
          /**
           * Block will be added to the utxo database
           */

          // Skip this block if it already exists in the database
          if (blockExists != null) {
            console.log(`Block ${block.hash} exists (sym = ${blockExists})`);
            continue;
          }

          // Check if the previous block was already processed
          if (previousBlockSymbol == null && block.height != 0) {
            console.log(`Previous block ${previousBlockHash} does not exist`);
            await this.checkForReorg();
          }

          // Update the database
          this.bestBlockHash = block.hash;
          await this.saveBlock(block);          
        }
      }

    } catch (e) {
      console.error('worker', e);
      process.exit(1);
    } finally {
      this.workerActive = false;
      this.events.emit('worker:quit');
    }
  }

  async writeBatches(batches) {
    await this._db.batch(batches);

    // Reset last seen
    this.lastSeenBlockHashes = {};
    this.lastSeenTxHashes = {};
    this.lastSeenAddresses = {};
    this.lastSeenUtxos = {};
    this.lastAddressUtxos = {};

    batches.length = 0;
  }

  async processBatches() {
    const batchedOperations = [];

    await Promise.all([
      this.processBatchedAddressSymbols(batchedOperations),
      this.processBatchedUtxoLists(batchedOperations),
      this.processBatchedBlockSymbols(batchedOperations),
      this.processBatchedBlockSymbolMappings(batchedOperations),
      this.processBatchedTxSymbols(batchedOperations),
      this.processBatchedUtxos(batchedOperations),
      this.processBatchedAddressUtxoLists(batchedOperations),
      this.processMetadata(batchedOperations),
    ]);

    await this.writeBatches(batchedOperations);

    batchedOperations.length = 0;

    // It is now safe to query block up to `this.lastBlockSymbol`
    this.safeLastBlockSymbol = this.lastBlockSymbol;
  }

  async processBatchesIfNeeded() {
    const batchCriterion = (
      this.dbBatches['block-sym'].length >= BLOCK_BATCH_SIZE ||
      this.dbBatches['tx-sym'].length >= TX_BATCH_SIZE ||
      this.dbBatches['address-sym'].length >= ADDRESS_BATCH_SIZE
    );

    const timeCriterion = false; // ToDo

    if (batchCriterion || timeCriterion) {
      await this.processBatches();
    }
  }

  /**
   * removeBlock removes the utxos created in a block,
   * and revalidates spent-outputs.
   * Technically, it uses direct writes instead of batches.
   */
  async removeBlock(block) {
    const hash = block.hash;

    // Recover last tx symbol, that was used before the block appeared.
    let minTxSymbol = Number.MAX_VALUE;

    // Loop through all transactions and remove the data
    const transactions = block.tx;
    for (const tx of transactions) {
      /**
       * In the following, we assume that all the database
       * entities exist.
       */ 

      // 1) Get the symbol
      const txSym = await this.getTxSymbol(tx.txid);
      if (txSym == null) {
        console.log(`Tx Symbol ${txSym} did not exist. Skipping removal.`);
        continue;
      }

      minTxSymbol = Math.min(minTxSymbol, txSym);

      // 2) Loop through inputs and re-validate the utxos
      for (let input of tx.vin) {
        const { txid, vout, coinbase } = input;

        if (!txid || vout == null) {
          if (!coinbase) throw new Error(`Invalid input @ blockSymbol = ${block.height}`);
          continue;
        }

        console.log(`  Revalidating ${txid}:${vout}`);

        const pair = await this.utxoExists(txid, vout);
        if (pair == null) {
          throw new Error(`Blockchain error. Utxo ${txid}:${vout} does not exist.`);
        }

        // 2.1) Re-validate utxo.
        // Spent utxos must be set to unspent.
        // This will set the keys `spentOnBlock`, `spentInTx` symbols to null.
        try {
          const decoded = UtxoValueSchema.decode(pair.value);
          decoded.spentOnBlock = null;
          decoded.spentInTx = null;

          const value = UtxoValueSchema.encode(decoded);

          this.dbBatches.utxo.push({
            type: 'put',
            key: pair.key,
            value: value,
          });

        } catch (e) {
          console.error(pair)
          console.error(pair.value)
          console.error(e);
        }
      }

      // 3) Remove newly created outputs
      for (const output of tx.vout) {
        try {
          /**
           * 3.1) Remove the utxo
           */

          // Get the address of the output
          const address = await this.getAddressSymbol(output);
          const addressSymbol = address.value;

          // Delete the utxo
          //console.log(`  Deleting ${tx.txid}:${output.n}`);
          const key = this.serializeUtxoKey(txSym, output.n);

          this.dbBatches.utxo.push({
            type: 'del',
            key: key,
          });

          if (!address || !address.key) {
            continue;
          }

          /**
           * 3.2) Delete the utxo from the address utxo list
           */

          // Get the utxo list
          //console.log(`  Deleting ${tx.txid}:${output.n} from ${address.key}`);
          const serializedUtxoList = await this.db['address-utxos'].get(encodeSymbol(addressSymbol))
            .catch(() => EMPTY_UTXO_LIST);
          
          // Decode the existing structure
          const deserializedUtxoList = AddressValueSchema.decode(serializedUtxoList);  
 
          // Remove the affected utxo
          for (let i = deserializedUtxoList.txSymbol.length; i >= 0; --i) {
            if (deserializedUtxoList.txSymbol[i] == txSym &&
                deserializedUtxoList.vout[i] == output.n) {
              // console.log('REMOVING UTXO', i, `(${output.n} | ${txSym})`)
              deserializedUtxoList.txSymbol.splice(i, 1);
              deserializedUtxoList.vout.splice(i, 1);
              break;
            }
          }

          // Save the list again
          this.dbBatches['address-utxos'].push({
            type: 'put',
            key: encodeSymbol(addressSymbol),
            value: AddressValueSchema.encode(deserializedUtxoList),
          });

          /**
           * 3.3) We do not remove the address symbol
           *   because it will most likely appear in future.
           */

        } catch (e) {
          console.error('ERROR', tx.txid, `output-${output.n}`, e);
        }
      } 

      // Delete tx symbol
      this.dbBatches['tx-sym'].push({
        type: 'del',
        key: hexToBin(tx.txid),
      });
    }

    // Remove the block symbol
    this.dbBatches['block-sym'].push({
      type: 'del',
      key: hexToBin(hash),
    });

    // Recover last tx symbol
    if (minTxSymbol != Number.MAX_VALUE) {
      this.lastTxSymbol = minTxSymbol - 1;
    }
  }

  async saveBlock(block) {
    this.lastBlockSymbol = block.height;

    await Promise.all([
      this.batchBlockSymbol(block.hash, block.height),
      this.batchBlockTxs(block, this.lastBlockSymbol),
    ]);

    await this.processBatchesIfNeeded();
  }

  async processBatchedUtxoLists(list) {
    for (const addressString of Object.keys(this.lastAddressUtxos)) {
      // Get the recent address utxos
      const utxoList = this.lastAddressUtxos[addressString];

      // Serialize the address and get the existing address utxos
      const address = await this.getAddressSymbolByAddress(addressString);
      const addressSymbol = address.value;

      const serializedUtxoList = await this.db['address-utxos'].get(encodeSymbol(addressSymbol))
        .catch(() => EMPTY_UTXO_LIST);

      // Decode the existing structure
      const deserializedUtxoList = AddressValueSchema.decode(serializedUtxoList);

      // Concatenate existing utxos with new utxos
      deserializedUtxoList.txSymbol = deserializedUtxoList.txSymbol.concat(utxoList.txSymbol);
      deserializedUtxoList.vout = deserializedUtxoList.vout.concat(utxoList.vout);
      deserializedUtxoList.address = serializeAddress(addressString);

      // Create database operation
      const operation = {
        type: 'put',
        key: encodeSymbol(addressSymbol),
        value: AddressValueSchema.encode(deserializedUtxoList),
      };

      // Add to batch
      list.push(
        // Converts key to prefixed key
        this.db['address-utxos'].process(operation),
      );
    }
  }

  processBatchedBlockSymbolMappings(list) {
    const ops = this.dbBatches['sym-block'];
    const operations = this.db['sym-block'].processList(ops);

    for (let op of operations) list.push(op);
    ops.length = 0;
  }

  processBatchedAddressUtxoLists(list) {
    const ops = this.dbBatches['address-utxos'];
    const operations = this.db['address-utxos'].processList(ops);

    for (let op of operations) list.push(op);
    ops.length = 0;    
  }

  processBatchedUtxos(list) {
    const ops = this.dbBatches.utxo;
    const operations = this.db.utxo.processList(ops);

    for (let op of operations) list.push(op);
    ops.length = 0;
  }

  processBatchedTxSymbols(list) {
    const ops = this.dbBatches['tx-sym'];
    const operations = this.db['tx-sym'].processList(ops);

    for (let op of operations) list.push(op);
    ops.length = 0;
  }

  processBatchedBlockSymbols(list) {
    const ops = this.dbBatches['block-sym'];
    const operations = this.db['block-sym'].processList(ops);

    for (let op of operations) list.push(op);
    ops.length = 0;
  }

  processBatchedAddressSymbols(list) {
    const ops = this.dbBatches['address-sym'];
    const operations = this.db['address-sym'].processList(ops);

    for (let op of operations) list.push(op);
    ops.length = 0;
  }

  processMetadata(list) {
    const ops = [
      {
        type: 'put',
        key: 'bestBlockHash',
        value: this.bestBlockHash,
      },
      {
        type: 'put',
        key: 'latestBlockSymbol',
        value: encodeSymbol(this.lastBlockSymbol),
      },
      {
        type: 'put',
        key: 'latestTxSymbol',
        value: encodeSymbol(this.lastTxSymbol),
      },
      {
        type: 'put',
        key: 'latestAddressSymbol',
        value: encodeSymbol(this.lastAddressSymbol),
      },
    ];

    if (this.genesisBlockHashUpdated) {
      ops.push({
        type: 'put',
        key: 'genesisBlockHash',
        value: this.genesisBlockHash,
      });

      this.genesisBlockHashUpdated = false;
    }

    list.push(...ops);
  }

  async batchBlockTxs(block, blockSymbol) {
    const transactions = block.tx;
    const ops = this.dbBatches['tx-sym'];

    for (const tx of transactions) {
      // Skip if already exists.
      const txSymbol = await this.getTxSymbol(tx.txid);
      if (txSymbol != null) {
        console.error(`Skipping because tx ${tx.txid} already processed`);
        continue;
      }

      // Get next tx symbol
      this.lastTxSymbol += 1;
      this.lastSeenTxHashes[tx.txid] = this.lastTxSymbol;

      ops.push({
        type: 'put',
        key: hexToBin(tx.txid),
        value: encodeSymbol(this.lastTxSymbol),
      });

      await this.batchTransactionInputs(tx, this.lastTxSymbol, blockSymbol);
      await this.batchTransactionOutputs(tx, this.lastTxSymbol, blockSymbol);
    }
  }

  serializeUtxoKey(txSymbol, n) {
    return UtxoKeySchema.encode({
      txSymbol,
      n,
    });
  }

  serializeUtxoValue(sats, address, createdOnBlock, spentInTx, spentOnBlock) {
    const encoded = UtxoValueSchema.encode({
      sats,
      address,
      createdOnBlock,
      spentOnBlock,
      spentInTx,
    });

    return encoded;
  }

  async utxoExistsBySymbol(txSymbol, vout) {
    // 1. Step: Check args
    if (txSymbol == null) {
      console.error('Null passed to utxoExistsBySymbol');
      return null;
    }

    // 2. Step: Generate the binary utxo key
    const key = this.serializeUtxoKey(txSymbol, vout);

    // 3. Step: Fetch from database using generated key
    const value = await this.db.utxo.get(key)
      .catch(() => null);

    if (value == null) {
      console.error('Could not find utxo in utxo db');
      return null;
    }

    // 4. Step: Return key and value
    return {
      key,
      value: Buffer.from(value),
      symbol: txSymbol,
    };
  }

  async utxoExists(txid, vout) {
    // Lookup in utxo cache
    const data = this.lastSeenUtxos[`${txid}:${vout}`];
    if (data != null) {
      // console.log(`Found utxo ${txid}:${vout} in utxo cache.`);
      return {
        symbol: data.txSymbol,
        value: this.serializeUtxoValue(data.sats, data.address, data.block, data.spentInTx, data.spentOnBlock),
        key: this.serializeUtxoKey(data.txSymbol, data.n),
      };
    }

    // console.log(`Looking into utxo db for ${txid}:${vout}...`);
    const txSymbol = await this.getTxSymbol(txid);
    return await this.utxoExistsBySymbol(txSymbol, vout);
  }

  async invalidateUtxo(txid, vout, sats, addressSymbol, blockSymbol, spentInTx, spentOnBlock, serializedKey = null) {
    const ops = this.dbBatches.utxo;

    // Step 1: Get binary encoding and retrieve the updated utxo value
    const key = serializedKey || this.serializeUtxoKey(spentInTx, vout);
    const value = this.serializeUtxoValue(sats, addressSymbol, blockSymbol, spentInTx, spentOnBlock);

    // Step 2: Add the updated utxo to the batch queue
    ops.push({
      type: 'put',
      key,
      value,
    });

    // Step 3: Add to last seen
    const identifier = `${txid}:${vout}`;
    const existing = this.lastSeenUtxos[identifier] || {};

    // Patch
    Object.assign(existing, {
      txSymbol: spentInTx,
      txid: txid,
      n: vout,
      block: blockSymbol,
      sats: sats,
      spentInTx: spentInTx,
      spentOnBlock: spentOnBlock,
      address: addressSymbol,
    });

    this.lastSeenUtxos[identifier] = existing;
  }

  async batchTransactionInputs(tx, txSymbol, blockSymbol) {
    for (const input of tx.vin) {
      // 1. Step: Check if utxo exists
      const { txid, vout, coinbase } = input;

      if (!txid || vout == null) {
        if (!coinbase) throw new Error(`Invalid input @ blockSymbol = ${blockSymbol}`);
        continue;
      }

      const pair = await this.utxoExists(txid, vout);
      if (pair == null) {
        throw new Error(`Blockchain error. Utxo ${txid}:${vout} does not exist.`);
      }

      // 2. Step: Invalidate utxo.
      // This will set the keys `spentOnBlock`, `spentInTx` symbols of the current utxo.
      try {
        const decoded = UtxoValueSchema.decode(pair.value);
        await this.invalidateUtxo(
          // txid, vout, sats, addressSymbol, blockSymbol, spentInTx, spentOnBlock, serializedKey
          txid,
          vout,

          // sats, addressSymbol and createdOnBlockSymbol
          // will be used from existing utxo.
          decoded.sats, 
          decoded.address,
          decoded.createdOnBlock, 

          // UTXO got invalidated in this transaction (used as input)
          // and in this block symbol.
          txSymbol,
          blockSymbol, 
          pair.key,
        );
      } catch (e) {
        console.error(pair)
        console.error(pair.value)
        console.error(e);
      }
    }
  }

  async getAddressSymbolByAddress(addressString) {
    const serializedAddress = serializeAddress(addressString);

    // Check in last seen addresses, and return if existing
    const lastSeenAddress = this.lastSeenAddresses[addressString];
    if (lastSeenAddress) {
      return {
        key: addressString,
        value: lastSeenAddress,
      };
    }

    // Get the address symbol from database
    const symbolData = await this.db['address-sym'].get(serializedAddress)
      .catch(() => null);

    let symbol = symbolData != null ? decodeSymbol(symbolData) : null;

    // If it did not exist, create a new one
    if (symbol == null) {
      symbol = ++this.lastAddressSymbol;

      this.dbBatches['address-sym'].push({
        type: 'put',
        key: serializedAddress,
        value: encodeSymbol(symbol), // encodedSymbol
      });

      this.lastSeenAddresses[addressString] = symbol;
    }

    const ret = {
      key: addressString,
      value: symbol,
    };

    return ret;
  }

  async getAddressSymbol(output) {
    // Add UTXO to address
    if (!output.scriptPubKey
        || !Array.isArray(output.scriptPubKey.addresses)
        || output.scriptPubKey.addresses.length != 1) {
      return {
        key: null,
        value: null,
      };
    }

    const addressString = output.scriptPubKey.addresses[0];
    return await this.getAddressSymbolByAddress(addressString);
  }

  async batchTransactionOutputs(tx, txSymbol, blockSymbol) {
    const ops = this.dbBatches.utxo;

    // Get the addresses
    for (const out of tx.vout) {
      out.address = await this.getAddressSymbol(out);
    }

    // Get binary encodings
    const kvPairs = tx.vout.map((out) => {
      const sats = convertToSatoshis(out.value);

      return {
        key: this.serializeUtxoKey(txSymbol, out.n),
        value: this.serializeUtxoValue(sats, out.address.value, blockSymbol),

        // Store original data
        txid: tx.txid,
        n: out.n,
        sats,
        output: out,
      };
    });

    // Add each utxo to the batch queue
    for (const pair of kvPairs) {
      const identifier = `${pair.txid}:${pair.n}`;

      if (!pair.output.address || !pair.output.address.key) {
        // console.log(`Skipping ${identifier}`);
        continue;
      }

      ops.push({
        type: 'put',
        key: pair.key,
        value: pair.value,
      });

      if (this.lastSeenUtxos[identifier]) {
        throw new Error('UTXO should only exist once');
      }

      this.lastSeenUtxos[identifier] = {
        txSymbol,
        txid: pair.txid,
        block: blockSymbol,
        n: pair.n,
        sats: pair.sats,
				address: pair.output.address.value,
      };

      await this.batchUtxoAdditionToAddress(tx, txSymbol, pair.output);
    }
  }

  async batchUtxoAdditionToAddress(tx, txSymbol, output) {
    if (output.address == null || output.address.key == null) return;
    const address = output.address.key;

    const utxoList = this.lastAddressUtxos[address] || {
      txSymbol: [],
      vout: [],
    };

    // Add the utxo to the list
    utxoList.txSymbol.push(txSymbol);
    utxoList.vout.push(output.n);

    this.lastAddressUtxos[address] = utxoList;
  }

  async batchBlockSymbol(hash, blockSymbol) {
    this.lastSeenBlockHashes[hash] = blockSymbol;

    // block hash -> block symbol
    this.dbBatches['block-sym'].push({
      type: 'put',
      key: hexToBin(hash),
      value: encodeSymbol(blockSymbol),
    });

    // block symbol -> block hash
    this.dbBatches['sym-block'].push({
      type: 'put',
      key: encodeSymbol(blockSymbol),
      value: hexToBin(hash),
    });
  }

  async getBlockHash(symbol) {
    let encodedSymbol;

    if (typeof symbol != 'number') {
      encodedSymbol = encodeSymbol(symbol);
    } else {
      encodedSymbol = symbol;
    }

    const encodedHash = await this.db['sym-block'].get(encodedSymbol)
      .catch(() => null);

    return binToHex(encodedHash);
  }

  async getBlockSymbol(hash) {
    if (!hash) return null;

    // Return symbol from the last seen cache.
    // console.log(hash);
    const isLastSeen = this.lastSeenBlockHashes[hash];
    if (isLastSeen != null) return isLastSeen;

    const encodedSymbol = await this.db['block-sym'].get(hexToBin(hash))
      .catch(() => null);

    return returnSymbol(encodedSymbol);
  }

  async getTxSymbol(hash) {
    // Return symbol from the last seen cache.
    const isLastSeen = this.lastSeenTxHashes[hash];
    if (isLastSeen != null) return isLastSeen;

    const encodedSymbol = await this.db['tx-sym'].get(hexToBin(hash))
      .catch(() => null);

    return returnSymbol(encodedSymbol);
  }

  async getAddressBySymbol(addressSymbol) {
    if (this.lastAddressSymbol < addressSymbol)
      throw new Error('Address does not exist yet');

    try {
      const serializedUtxoList = 
        await this.db['address-utxos'].get(encodeSymbol(addressSymbol));

      const utxoData = AddressValueSchema.decode(serializedUtxoList);

      if (!utxoData.address) {
        throw new Error('No address accociated with this symbol');
      }

      return utxoData.address;

    } catch(e) {
      console.error(e);
      return null;
    }
  }

  async getAccountUtxos(address) {
    const result = [];

    try {
      const addressSymbol = await this.getAddressSymbolByAddress(serializeAddress(address));
      const utxos = await this.db['address-utxos'].get(addressSymbol.value);
      const utxoList = AddressValueSchema.decode(utxos);

      for (let i = 0; i < utxoList.txSymbol.length; ++i) {
        const txid = utxoList.txSymbol[i];
        const vout = utxoList.vout[i];

        const utxo = await this.utxoExistsBySymbol(txid, vout);
        if (!utxo) {
          throw new Error(`Could not find utxo ${txid}:${vout}`);
        }

        const decodedUtxo = UtxoValueSchema.decode(utxo.value);
        result.push({
          txid,
          vout,
          sats: decodedUtxo.sats,
        });
      }

    } catch (e) {
      console.error(e);
    }

    return result;
  }

  async getAccountBalance(address, atBlock = null) {
    try {
      let blockSymbol;
      let blockHash;

      if (typeof atBlock === 'number') {
        // lookup block hash
        if (atBlock < this.lastBlockSymbol) {
          throw new Error(
            `Block height ${atBlock} is not available.`
            + ` Node to ${this.this.lastBlockSymbol}.`,
          );
        }

        blockSymbol = atBlock;
        blockHash = await this.getBlockHash(blockSymbol);

        if (!blockHash) {
          throw new Error(`No block hash found for height ${blockSymbol}`);
        }

      } else if (typeof atBlock === 'string') {
        // lookup block symbol
        blockHash = atBlock;
        blockSymbol = await this.getBlockSymbol(blockHash);

        if (blockSymbol == null) {
          throw new Error(`No block found for hash ${atBlock}`);
        }
      }

      // If no block was specified, use the most recent one
      if (!blockSymbol) {
        blockSymbol = this.lastBlockSymbol;
        blockHash = this.bestBlockHash;
      }

      const addressSymbol = await this.getAddressSymbolByAddress(serializeAddress(address));
      const utxos = await this.db['address-utxos'].get(encodeSymbol(addressSymbol.value));
      const utxoList = AddressValueSchema.decode(utxos);
      let balance = 0;

      for (let i = 0; i < utxoList.txSymbol.length; ++i) {
        const symbol = utxoList.txSymbol[i];
        const vout = utxoList.vout[i];

        const utxo = await this.utxoExistsBySymbol(symbol, vout);
        if (!utxo) {
          throw new Error(`Could not find utxo ${symbol}:${vout}`);
        }

        const decodedUtxo = UtxoValueSchema.decode(utxo.value);

        // Skip if utxo does not exist at specified block
        if (decodedUtxo.createdOnBlock > blockSymbol) {
          continue;
        }

        // Skip if spent before specified block
        if (decodedUtxo.spentOnBlock != null && blockSymbol > decodedUtxo.spentOnBlock) {
          continue;
        }

        balance += decodedUtxo.sats;
      }

      return {
        balance,
        blockSymbol,
        blockHash,
      };

    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async getUtxoData(txid, vout) {
    try {
      const utxo = await this.utxoExists(txid, vout);
      if (utxo == null)
        throw new Error(`Utxo ${txid}:${vout} does not exist`);

      // eslint-disable-next-line no-unused-vars
      const { key, value, symbol } = utxo;

      const decoded = UtxoValueSchema.decode(value);
      const addressSymbol = decoded.address;
      const sats = decoded.sats;

      if (addressSymbol == 0)
        throw new Error('Utxo exists but has no address accociated with it');

      const address = await this.getAddressBySymbol(addressSymbol);
      if (!address)
        throw new Error(`Address symbol ${addressSymbol} could not be resolved`);

      return {
        address: deserializeAddress(address),
        sats,
      };

    } catch(e) {
      console.error(e);
      return null;
    }
  }

  async initBestBlockHash() {
    try {
      const bestBlockHash = await this._db.get('bestBlockHash');
      this.bestBlockHash = bestBlockHash;
    } catch (e) {
      this.bestBlockHash = null;
    }
  }

  async initGenesisHash() {
    try {
      const genesisBlockHash = await this._db.get('genesisBlockHash');
      this.genesisBlockHash = genesisBlockHash;
    } catch (e) {
      this.genesisBlockHash = null;
    }
  }

  async initBlockSymbol() {
    try {
      const blockSymbol = await this._db.get('latestBlockSymbol');
      this.lastBlockSymbol = returnSymbol(blockSymbol);
    } catch (e) {
      this.lastBlockSymbol = -1;
    }

    this.safeLastBlockSymbol = this.lastBlockSymbol;
  }

  async initTxSymbol() {
    try {
      const txSymbol = await this._db.get('latestTxSymbol');
      this.lastTxSymbol = returnSymbol(txSymbol);
    } catch (e) {
      this.lastTxSymbol = -1;
    }
  }

  async initAddressSymbol() {
    try {
      const addressSymbol = await this._db.get('latestAddressSymbol');
      this.lastAddressSymbol = returnSymbol(addressSymbol);
    } catch (e) {
      this.lastAddressSymbol = -1;
    }
  }

  checkFeatures(db) {
    if (!db.supports.permanence) {
      throw new Error('Persistent storage is required');
    }

    if (!db.supports.bufferKeys || !db.supports.promises) {
      throw new Error('Promises and BufferKeys are required');
    }
  }

  async initIndexer() {
    this.createDatabase();
    this.checkFeatures(this._db);

    // this.createDatabase('metadata');
    this.createDatabaseInfo('block-sym', PREFIX_BLOCK_SYM);
    this.createDatabaseInfo('sym-block', PREFIX_SYM_BLOCK);
    this.createDatabaseInfo('tx-sym', PREFIX_TX_SYM);
    this.createDatabaseInfo('utxo', PREFIX_UTXO);
    this.createDatabaseInfo('address-utxos', PREFIX_ADDRESS_UTXOS);
    this.createDatabaseInfo('address-sym', PREFIX_ADDRESS_SYM);

    await this.initBestBlockHash();
    await this.initGenesisHash();
    await this.initBlockSymbol();
    await this.initTxSymbol();
    await this.initAddressSymbol();
  }
}

module.exports = Indexer;
