/* Singleton module for Syncer */
const config = require('../config');
const Syncer = require('./Syncer');
const DigiByteIndexer = require('./digibyteIndexer');

const DigiByteSyncer = new Syncer(config.syncer, DigiByteIndexer);
module.exports = DigiByteSyncer;
