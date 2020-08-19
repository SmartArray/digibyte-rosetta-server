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
  NODE_SYNCING: new Types.Error(6, 'The requested data is not available, as the node is still syncing.', true),
  UNABLE_TO_RETRIEVE_BALANCE: new Types.Error(7, 'The account balance could not be retrieved', true),

  INVALID_CURVE_TYPE: new Types.Error(8, 'Curve type must be secp256k1', false),
  UNABLE_TO_DERIVE_ADDRESS: new Types.Error(9, 'Unable to derive address from public key', false),

  INSUFFICIENT_BALANCE: new Types.Error(10, 'Insufficient balance', false),
  EXPECTED_REQUIRED_ACCOUNTS: new Types.Error(11, 'No relevant accounts with their required amounts passed to this endpoint.', false),
  EXPECTED_RELEVANT_INPUTS: new Types.Error(12, 'No relevant inputs were passed to this endpoint', false),
};

module.exports = errors;
