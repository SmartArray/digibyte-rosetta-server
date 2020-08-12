const RosettaSDK = require('rosetta-node-sdk');
const Types = RosettaSDK.Client;

Types.Error.prototype.addDetails = function addDetails(data) {
  this.details = Object.assign(this.details || {}, data);
  return this;
};

const errors = {
  UNABLE_TO_RETRIEVE_NODE_STATUS: new Types.Error(1, 'Network Status could not be retrieved', true),
  UNABLE_TO_FETCH_BLOCK: new Types.Error(2, 'Could not fetch block', true),
  ENDPOINT_DISABLED: new Types.Error(3, 'This endpoint is disabled', false),
  UNABLE_TO_FETCH_MEMPOOL_TXS: new Types.Error(4, 'Could not fetch mempool transactions', true),
  UNABLE_TO_FETCH_MEMPOOL_TX: new Types.Error(5, 'Could not fetch mempool transaction', true),
  NODE_SYNCING: new Types.Error(6, 'The underlying node is still syncing', true),
  UNABLE_TO_RETRIEVE_BALANCE: new Types.Error(7, 'The account balance could not be retrieved', true),
};

module.exports = errors;