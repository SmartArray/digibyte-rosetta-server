/**
 * Copyright (c) 2020 DigiByte Foundation NZ Limited
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const RosettaSDK = require('rosetta-node-sdk');

const config = require('./config');
const networkIdentifier = require('./config/networkIdentifier');
const ServiceHandlers = require('./src/services');
const DigiByteSyncer = require('./src/Syncer');
const DigiByteIndexer = require('./src/digibyteIndexer');
const rpc = require('./src/rpc');

console.log(`                                                                    
 ____  _     _ _____     _          _____             _   _          _____       _     
|    \\|_|___|_| __  |_ _| |_ ___   | __  |___ ___ ___| |_| |_ ___   |   | |___ _| |___ 
|  |  | | . | | __ -| | |  _| -_|  |    -| . |_ -| -_|  _|  _| .'|  | | | | . | . | -_|
|____/|_|_  |_|_____|_  |_| |___|  |__|__|___|___|___|_| |_| |__,|  |_|___|___|___|___|
        |___|       |___|                                                              

             Version                  ${config.version}
             Rosetta Version          ${config.rosettaVersion}
             DigiByte Node Version    ${config.digibyteVersion}
             Networks                 ${JSON.stringify(config.serverConfig.networkIdentifiers)}
             Port                     ${config.port}
`);

/* Create a server configuration */
const Server = new RosettaSDK.Server({
  URL_PORT: config.port,
});

const historicalBalanceLookup = false;

const asserter = RosettaSDK.Asserter.NewServer(
  config.serverConfig.operationTypesList,
  historicalBalanceLookup,
  config.serverConfig.networkIdentifiers,
);

// Register global asserter
Server.useAsserter(asserter);

/* Data API: Network */
Server.register('/network/list', ServiceHandlers.Network.networkList);
Server.register('/network/options', ServiceHandlers.Network.networkOptions);
Server.register('/network/status', ServiceHandlers.Network.networkStatus);

/* Data API: Block */
Server.register('/block', ServiceHandlers.Block.block);
Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);

/* Data API: Account */
Server.register('/account/balance', ServiceHandlers.Account.balance);

/* Data API: Mempool */
Server.register('/mempool', ServiceHandlers.Mempool.mempool);
Server.register('/mempool/transaction', ServiceHandlers.Mempool.mempoolTransaction);

/* Data API: Construction */
Server.register('/construction/metadata', ServiceHandlers.Construction.constructioMetadata);
Server.register('/construction/submit', ServiceHandlers.Construction.constructionSubmit);

/* Initialize Syncer */
const Syncer = new DigiByteSyncer(config.syncer, DigiByteIndexer);

const startSyncer = async () => {
  console.log(`Internal utxo sync state: block height = ${DigiByteIndexer.lastBlockSymbol}`);
  await Syncer.initSyncer();

  continueSyncIfNeeded();
  return true;
};

const continueSyncIfNeeded = async () => {
  const currentHeight = DigiByteIndexer.lastBlockSymbol;
  const blockCountResponse = await rpc.getBlockCountAsync();
  const blockCount = blockCountResponse.result;

  if (currentHeight >= blockCount) {
    Syncer.setIsSynced();
    return setTimeout(continueSyncIfNeeded, 10000);
  }

  const nextHeight = currentHeight + 1;

  // Sync the next blocks
  const syncCount = Math.min(blockCount - nextHeight, 1000);
  console.log(`Syncing blocks from ${nextHeight}-${nextHeight + syncCount}...`);
  await Syncer.sync(nextHeight, nextHeight + syncCount);
  await Indexer.saveState();

  setImmediate(() => {
    continueSyncIfNeeded();
  });
};

DigiByteIndexer.initIndexer()
  .then(startSyncer)
  .catch((e) => {
    console.error(`Could not start sync: ${e.message}`);
    console.error(e);
  });