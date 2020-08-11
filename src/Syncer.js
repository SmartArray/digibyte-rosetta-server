const RosettaSDK = require('rosetta-node-sdk');
const EventEmitter = require('events');

const networkIdentifier = require('../config/networkIdentifier');

class Syncer extends EventEmitter {
  constructor(config, indexer) {
    super();

    const fetcher = new RosettaSDK.Fetcher({
      server: {
        protocol: 'http',
        host: 'localhost',
        port: '8080',        
      },
    });

    this.indexer = indexer;
    this.fetcher = fetcher;
    this.syncer = null;
    this.syncPaused = false;
    this.isSynced = false;
  }

  async initSyncer() {
    // console.log('Initializing Syncer...');

    /* Create a fetcher */
    const fetcher = this.fetcher;
    const { networkStatus } = await fetcher.initializeAsserter();

    /* Define some options for the syncer */
    const genesisBlock = networkStatus.genesis_block_identifier;
    const maxSync = 200;

    /* Create the syncer */
    const syncer = new RosettaSDK.Syncer({
      networkIdentifier,
      fetcher,
      genesisBlock,
      maxSync,
    });

    /* Handle events of the syncer*/
    syncer.on(RosettaSDK.Syncer.Events.BLOCK_ADDED, this.blockAdded.bind(this));
    syncer.on(RosettaSDK.Syncer.Events.BLOCK_REMOVED, this.blockRemoved.bind(this));
    syncer.on(RosettaSDK.Syncer.Events.BLOCK_REMOVED, this.syncStopped.bind(this));

    this.syncPaused = false;
    this.syncer = syncer;

    // console.log('Successfully initialized syncer!');
    return syncer;
  }
  
  sync(start, end) {
    return this.syncer.sync(start, end);
  }

  setIsSynced() {
    if (!this.isSynced) {
      console.log('Blockchain synced!');
    }

    this.isSynced = true;
  }

  blockAdded(block) {
    if (this.indexer == null) return;
    this.indexer.handleBlock(block);
  }

  blockRemoved(block) {
    if (this.indexer == null) return;
    this.indexer.handleBlock(block, true);
  }

  syncStopped() {

  }  
};

module.exports = Syncer;