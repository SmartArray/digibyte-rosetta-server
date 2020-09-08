const { expect } = require('chai');
const axios = require('axios');
const RosettaSDK = require('rosetta-node-sdk');

const ServiceHandlers = require('../../../src/services');
const DigiByteSyncer = require('../../../src/digibyteSyncer');
const DigiByteIndexer = require('../../../src/digibyteIndexer');
const Config = require('../../../config');
const rpc = require('../../../src/rpc');

/**
 * This test requires two docker regtest containers to run with 
 * the following configuration parameters:
 *
 *
 * 1) regtest=1 offline=1 portmap=1337:8080
 * 2) regtest=1 offline=0 portmap=1338:8080

 * Note that Regtest is using: 
 *   p2p: 18444
 *   rpc: 18443
 */

// async function mockServer(Config) {
//     /* Create a server configuration */
//   const Server = new RosettaSDK.Server({
//     URL_PORT: Config.port,
//   });

//   const asserter = RosettaSDK.Asserter.NewServer(
//     Config.serverConfig.operationTypesList,
//     Config.serverConfig.historicalBalanceLookup,
//     Config.serverConfig.networkIdentifiers,
//   );  

//   // Register global asserter
//   Server.useAsserter(asserter);

//   /* Data API: Network */
//   Server.register('/network/list', ServiceHandlers.Network.networkList);
//   Server.register('/network/options', ServiceHandlers.Network.networkOptions);
//   Server.register('/network/status', ServiceHandlers.Network.networkStatus);

//   /* Data API: Block */
//   Server.register('/block', ServiceHandlers.Block.block);
//   Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);

//   /* Data API: Account */
//   Server.register('/account/balance', ServiceHandlers.Account.balance);

//   /* Data API: Mempool */
//   Server.register('/mempool', ServiceHandlers.Mempool.mempool);
//   Server.register('/mempool/transaction', ServiceHandlers.Mempool.mempoolTransaction);

//   /* Construction API */
//   if (Config.offline) {
//     Server.register('/construction/derive', ServiceHandlers.Construction.constructionDerive); // 1
//     Server.register('/construction/preprocess', ServiceHandlers.Construction.constructionPreprocess); // 2
//     Server.register('/construction/payloads', ServiceHandlers.Construction.constructionPayloads); // 4
//     Server.register('/construction/parse', ServiceHandlers.Construction.constructionParse); // 5, 7
//     Server.register('/construction/combine', ServiceHandlers.Construction.constructionCombine); // 6
//     Server.register('/construction/hash', ServiceHandlers.Construction.constructionHash); // 8
//   } else {
//     Server.register('/construction/metadata', ServiceHandlers.Construction.constructionMetadata); // 3
//     Server.register('/construction/submit', ServiceHandlers.Construction.constructionSubmit); // 9
//   }

//   /* Initialize Syncer */
//   const startSyncer = async () => {
//     console.log(`Starting sync from height ${DigiByteIndexer.lastBlockSymbol + 1}...`);
//     await DigiByteSyncer.initSyncer();

//     continueSyncIfNeeded();
//     return true;
//   };

//   const continueSyncIfNeeded = async () => {
//     const currentHeight = DigiByteIndexer.lastBlockSymbol;
//     const blockCountResponse = await rpc.getBlockCountAsync();
//     const blockCount = blockCountResponse.result;

//     if (currentHeight >= blockCount) {
//       // If the sync block height equals the best block height,
//       // set the syncer as synced.
//       DigiByteSyncer.setIsSynced();
//       return setTimeout(continueSyncIfNeeded, 10000);
//     }

//     const nextHeight = currentHeight + 1;

//     // Sync the next blocks
//     const syncCount = Math.min(blockCount - nextHeight, 1000);
//     const targetHeight = nextHeight + syncCount;

//     await DigiByteSyncer.sync(nextHeight, targetHeight);
//     await DigiByteIndexer.saveState();

//     setImmediate(() => {
//       // Continue to sync, but using the event queue.
//       // That way, the promise chain gets interrupted
//       // and memory leaks are prevented.
//       continueSyncIfNeeded(); // loop
//     });
//   };

//   const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

//   const startServer = async () => {
//     Server.launch();
//   };

//   const checkConnection = async () => {
//     process.stdout.write('Waiting for RPC node to be ready...');

//     for (;;) {
//       try {
//         const response = await rpc.getBlockCountAsync();
//         if (response.result == 0) throw new Error('Block height is zero');
//         break;
//       } catch (e) {
//         await wait(30000);
//         process.stdout.write('.');
//       }
//     }

//     console.log(' RPC Node ready!');
//   };

//   const init = async () => {
//     // Wait until rpc is reachable
//     await checkConnection();

//     // Start the REST Server
//     await startServer();

//     // Init the UTXO indexing service
//     await DigiByteIndexer.initIndexer();

//     // Start the UTXO indexer
//     await startSyncer();
//   };

//   const initOffline = async () => {
//     // Start the REST Server
//     await startServer();
//   };

//   if (Config.offline) {
//     await initOffline();
//   } else {
//     await init();
//   }
// }

describe('Construction API', () => {
  it('should be able to reach online instance', async () => {
    
  }).timeout(10000);

  it('should be able to reach offline instance', async () => {
  }).timeout(10000);

  it('should reach online container', async () => {

  });

  it('should reach offline container', async () => {

  });
});