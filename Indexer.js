
const level = require('level');
const JSBinType = require('js-binary').Type;

const syncBlockCache = require('./syncBlockCache');

const BLOCK_BATCH_SIZE = 30;
const TX_BATCH_SIZE = 2000;
const SATOSHI = 100000000;

const utxoValueSchema = new JSBinType({
  'sats': 'uint',
  'spentOnBlock?': 'uint',
  'spentInTx?': 'uint',
});

const utxoKeySchema = new JSBinType({
  'txSymbol': 'uint',
  'n': 'uint',
});

const addressValueSchema = new JSBinType({
  'txSymbol': ['uint'],
  'vout': ['uint'],
});

const EMPTY_UTXO_LIST = addressValueSchema.encode({
  txSymbol: [],
  vout: []
});

const convertToSatoshis = (value) => {
  const ret = Math.floor(value * SATOSHI);
  return ret;
}

const returnSymbol = (symbol) => {
  if (symbol == null) return null;
  if (typeof symbol == 'number') return symbol;
  return parseInt(symbol);
};

const hexToBin = (hexString) => {
  return hexString;

  // ToDo: 

  if (typeof hexString !== 'string' || hexString.length == 0) {
  }
  
  return Buffer.from(hexString, 'hex');
}

const serializeAddress = (address) => {
  return address;
}

class Indexer {
  constructor(config = {}) {
    if (typeof config.path !== 'string' || config.path.length == 0) {
      throw new Error('DB path not valid');
    }

    this.path = config.path;
    this.db = {};

    this.genesisBlockHash = undefined;
    this.bestBlockHash = undefined;
    this.lastBlockSymbol = undefined;
    this.lastTxSymbol = undefined;

    this.genesisBlockHashUpdated = false;

    this.workQueue = [];
    this.dbBatches = [];
    this.workerActive = false;

    this.lastSeenBlockHashes = {};
    this.lastSeenTxHashes = {};
    this.lastSeenUtxos = {};
  }

  createDatabase(key, binaryValue = false) {
    const options = {};

    if (binaryValue)
      options.valueEncoding = 'binary';

    this.db[key] = level(`${this.path}/${key}`, options);   
    this.dbBatches[key] = []; 
  }

  handleBlock(block, removed = false) {
    const blockHash = block.block_identifier.hash;
    const blockData = syncBlockCache.get(blockHash);

    if (!blockData) {
      throw new Error(`CRITICAL: No data found in SyncBlockCache for ${blockHash}`);
    }

    this.workQueue.push(blockData);
    this.worker();
  }

  async worker() {
    if (this.workerActive || this.workQueue.length == 0) return;
    this.workerActive = true;

    try {
      while(this.workQueue.length > 0) {
        const block = this.workQueue.shift();

        if (this.genesisBlockHash == null) {
          // Expect a genesis block

          if (block.height == 0) {
            // Remember the genesisBlockHash
            this.genesisBlockHash = block.hash;
            this.genesisBlockHashUpdated = true;

          } else {
            throw new Error(`CRITICAL: No Genesis Block was passed to Indexer.`);
          }

        } else {
          // Skip this block if it already exists in the database
          const blockExists = await this.getBlockSymbol(block.hash);
          if (blockExists != null) {
            console.log(`Block ${block.hash} exists (sym = ${blockExists})`);
            continue;
          }

          // Check if the previous block was already processed
          const previousBlockHash = block.previousblockhash;
          const previousBlockExists = await this.getBlockSymbol(previousBlockHash);
          if (previousBlockExists == null && !block.height == 0) {
            throw new Error(`Previous block ${previousBlockHash} does not exist`);
          }
        }

        // Update the database
        this.bestBlockHash = block.hash;
        await this.saveBlock(block);

        if (block.height % 100 == 0 && block.height != 0)
          console.log(`Synched blocks ${block.height - 100}-${block.height}`);
      }
    } catch (e) {
      console.error('worker', e);
      process.exit(1);

    } finally {
      this.workerActive = false;    
    }
  }

  async processBatchesIfNeeded() {
    const batchCriterion = (this.dbBatches['block-sym'].length >= BLOCK_BATCH_SIZE || 
      this.dbBatches['tx-sym'].length >= TX_BATCH_SIZE);
    const timeCriterion = false; // ToDo

    if (batchCriterion || timeCriterion) {
      await Promise.all([
        this.saveBatchedBlockSymbols(),
        this.saveBatchedTxSymbols(),
        this.saveBatchedUtxos(),
        this.saveBatchedUtxoLists(),
      ]);

      await this.updateMetadata();
      console.log('VERBOSE: Metadata saved');

      // Reset last seen
      this.lastSeenBlockHashes = {};
      this.lastSeenTxHashes = {};
      this.lastSeenUtxos = {};
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

  async saveBatchedUtxoLists() {
    const ops = this.dbBatches['address-utxos'];
    await this.db['address-utxos'].batch(ops);

    ops.length = 0;
  }

  async saveBatchedUtxos() {
    const ops = this.dbBatches['utxo'];
    await this.db['utxo'].batch(ops);

    ops.length = 0;
  }

  async saveBatchedTxSymbols() {
    const ops = this.dbBatches['tx-sym'];
    await this.db['tx-sym'].batch(ops);

    ops.length = 0;
  }

  async saveBatchedBlockSymbols() {
    const ops = this.dbBatches['block-sym'];
    await this.db['block-sym'].batch(ops);

    ops.length = 0;
  }

  async updateMetadata() {
    try {
      const ops = [
        { type: 'put', key: 'bestBlockHash', value: this.bestBlockHash },
        { type: 'put', key: 'latestBlockSymbol', value: this.lastBlockSymbol },
        { type: 'put', key: 'latestTxSymbol', value: this.lastTxSymbol },
      ];

      if (this.genesisBlockHashUpdated) {
        ops.push({ type: 'put', key: 'genesisBlockHash', value: this.genesisBlockHash });
        this.genesisBlockHashUpdated = false;
      }

      await this.db['metadata'].batch(ops);

    } catch (e) {
      console.error('updateMetadata', e);
    }
  }

  async batchBlockTxs(block, blockSymbol) {
    const transactions = block.tx;
    const ops = this.dbBatches['tx-sym'];

    for (let tx of transactions) {
      // Skip if already exists.
      const txSymbol = await this.getTxSymbol(tx.txid);
      if (txSymbol != null) continue;

      // Get next tx symbol
      this.lastTxSymbol = this.lastTxSymbol + 1;
      this.lastSeenTxHashes[tx.txid] = this.lastTxSymbol;

      ops.push({
        type: 'put',
        key: hexToBin(tx.txid),
        value: this.lastTxSymbol,
      });

      await this.batchTransactionInputs(tx, this.lastTxSymbol, blockSymbol);
      await this.batchTransactionOutputs(tx, this.lastTxSymbol);
    }
  }

  serializeUtxoKey(txSymbol, n) {
    return utxoKeySchema.encode({
      txSymbol,
      n,
    });
  }

  serializeUtxoValue(sats, spentInTx, spentOnBlock) {
    const encoded = utxoValueSchema.encode({
      sats,
      spentOnBlock,
      spentInTx,
    });

    return encoded;
  }

  async utxoExists(txid, vout) {
    // Lookup in utxo cache
    let data = this.lastSeenUtxos[`${txid}:${vout}`];
    if (data != null) {
      console.error(`Found utxo ${txid}:${vout} in utxo cache.`);
      return {
        symbol: data.txSymbol,
        value: this.serializeUtxoValue(data.sats, data.spentInTx, data.spentOnBlock),
        key: this.serializeUtxoKey(data.txSymbol, data.n),
      };
    }

    console.error(`Looking into utxo db for ${txid}:${vout}...`);

    // Lookup in db.
    // 1. Step: Get the tx symbol
    const txSymbol = await this.getTxSymbol(txid);
    if (txSymbol == null) {
      console.error(`Could not find tx symbol for ${txid}`);
      return null;
    }

    // 2. Step: Generate the binary utxo key 
    const key = this.serializeUtxoKey(txSymbol, vout);

    // 3. Step: Fetch from database using generated key
    const value = await this.db['utxo'].get(key)
      .catch(e => null);

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

  async invalidateUtxo(txid, vout, sats, spentInTx, spentOnBlock, serializedKey = null) {
    const ops = this.dbBatches['utxo'];

    // Step 1: Get binary encoding and retrieve the updated utxo value
    const key = serializedKey || this.serializeUtxoKey(spentInTx, vout);
    const value = this.serializeUtxoValue(sats, spentInTx, spentOnBlock);

    // Step 2: Add the updated utxo to the batch queue
    ops.push({
      type: 'put',
      key,
      value,
    });

    // Step 3: Add to last seen
    this.lastSeenUtxos[`${txid}:${vout}`] = {
      txSymbol: spentInTx,
      txid: txid,
      n: vout,
      sats,
      spentInTx,
      spentOnBlock,
    };
  }

  async batchTransactionInputs(tx, txSymbol, blockSymbol) {
    for (let input of tx.vin) {
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
      const decoded = utxoValueSchema.decode(pair.value);
      await this.invalidateUtxo(txid, vout, decoded.sats, txSymbol, blockSymbol, pair.key);
    }
  }

  async batchTransactionOutputs(tx, txSymbol) {
    const ops = this.dbBatches['utxo'];

    // Get binary encodings
    const kvPairs = tx.vout.map(out => {
      const sats = convertToSatoshis(out.value);

      return {
        key: this.serializeUtxoKey(txSymbol, out.n),
        value: this.serializeUtxoValue(sats),

        // Store original data
        txid: tx.txid,
        n: out.n,
        sats,
        output: out,
      };
    });

    // Add each utxo to the batch queue
    for (let pair of kvPairs) {
      ops.push({
        type: 'put',
        key: pair.key,
        value: pair.value,
      });

      this.lastSeenUtxos[`${pair.txid}:${pair.n}`] = {
        txSymbol,
        txid: pair.txid,
        n: pair.n,
        sats: pair.sats,
      };

      await this.batchUtxoAdditionToAddress(tx, txSymbol, pair.output);
    }
  }

  async batchUtxoAdditionToAddress(tx, txSymbol, output) {
    // Add UTXO to address
    if (!output.scriptPubKey ||
        !Array.isArray(output.scriptPubKey.addresses) || 
        output.scriptPubKey.addresses.length != 1) {
      return;
    }

    const address = output.scriptPubKey.addresses[0];
    // console.log(address, `+${output.value}`);

    const ops = this.dbBatches['address-utxos'];

    const serializedAddress = serializeAddress(address);
    const serializedUtxoList = await this.db['address-utxos'].get(serializedAddress)
      .catch(e => EMPTY_UTXO_LIST);

    const deserializedUtxoList = addressValueSchema.decode(serializedUtxoList);

    // Add the utxo to the list
    deserializedUtxoList.txSymbol.push(txSymbol);
    deserializedUtxoList.vout.push(output.n);

    ops.push({
      type: 'put',
      key: serializeAddress,
      value: addressValueSchema.encode(deserializedUtxoList),
    });
  }

  async batchUtxoRemovalFromAddress(tx, txSymbol, output) {
    // Remove UTXO from address
    if (!output.scriptPubKey ||
        !Array.isArray(output.scriptPubKey.addresses) || 
        output.scriptPubKey.addresses.length != 1) {
      return;
    }

    const address = output.scriptPubKey.addresses[0];
    console.log(address, `+${output.value}`);
  }

  async batchBlockSymbol(hash, blockSymbol) {
    this.lastSeenBlockHashes[hash] = blockSymbol;

    this.dbBatches['block-sym'].push({
      type: 'put',
      key: hexToBin(hash),
      value: blockSymbol,
    });
  }

  async getBlockSymbol(hash) {
    // Return symbol from the last seen cache.
    const isLastSeen = this.lastSeenBlockHashes[hash];
    if (isLastSeen != null) return isLastSeen;

    const symbol = await this.db['block-sym'].get(hexToBin(hash))
      .catch(e => null);

    return returnSymbol(symbol);
  }

  async getTxSymbol(hash) {
    // Return symbol from the last seen cache.
    const isLastSeen = this.lastSeenTxHashes[hash];
    if (isLastSeen != null) return isLastSeen;

    const symbol = await this.db['tx-sym'].get(hexToBin(hash))
      .catch(e => null);

    return returnSymbol(symbol);
  }

  async initBestBlockHash() {
    try {
      const bestBlockHash = await this.db['metadata'].get('bestBlockHash');
      this.bestBlockHash = bestBlockHash;
    } catch (e) {
      this.bestBlockHash = null;
    }    
  }

  async initGenesisHash() {
    try {
      const genesisBlockHash = await this.db['metadata'].get('genesisBlockHash');
      this.genesisBlockHash = genesisBlockHash;
    } catch (e) {
      this.genesisBlockHash = null;
    }    
  }

  async initBlockSymbol() {
    try {
      const blockSymbol = await this.db['metadata'].get('latestBlockSymbol');
      this.lastBlockSymbol = parseInt(blockSymbol);
    } catch (e) {
      this.lastBlockSymbol = -1;
    }    
  }

  async initTxSymbol() {
    try {
      const txSymbol = await this.db['metadata'].get('latestTxSymbol');
      this.lastTxSymbol = parseInt(txSymbol);
    } catch (e) {
      this.lastTxSymbol = -1;
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

  async initIndexer(genesisBlockHash) {
    this.createDatabase('metadata');
    this.checkFeatures(this.db['metadata']);

    this.createDatabase('block-sym');
    this.createDatabase('tx-sym');
    this.createDatabase('address-sym');

    this.createDatabase('utxo', true);
    this.createDatabase('address-utxos');
    this.createDatabase('block-height');

    await this.initBestBlockHash();
    await this.initGenesisHash();
    await this.initBlockSymbol();
    await this.initTxSymbol();

    console.log({
      lastBlockSymbol: this.lastBlockSymbol,
      lastTxSymbol: this.lastTxSymbol,
      genesisBlockHash: this.genesisBlockHash,
      bestBlockHash: this.bestBlockHash,
    });
  }
}

module.exports = Indexer;
