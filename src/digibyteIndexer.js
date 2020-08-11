const config = require('../config');
const Indexer = require('./Indexer');

const digiByteIndexer = new Indexer(config.data);
module.exports = digiByteIndexer;