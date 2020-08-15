const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const errors = require('./errors');
const mainNetworkIdentifier = require('./networkIdentifier');

const LABEL_SUCCESS = 'SUCCESS';
const LABEL_FAILED = 'FAILED';
const LABEL_TRANSFER = 'TRANSFER';
const LABEL_COINBASE = 'COINBASE';

const currencyCode = 'DGB';
const currencyDecimals = 8;
const currency = new Types.Currency(currencyCode, currencyDecimals);

const networkIdentifiers = [
  mainNetworkIdentifier,
];

const OperationStatusSuccess = new Types.OperationStatus(LABEL_SUCCESS, true);
const OperationStatusFailed = new Types.OperationStatus(LABEL_FAILED, false);

const operationStatusesList = [
  OperationStatusSuccess,
  OperationStatusFailed,
];

const operationTypesList = [
  LABEL_TRANSFER,
  LABEL_COINBASE,
];

const historicalBalanceLookup = false;

module.exports = {
  currency,
  networkIdentifiers,
  operationStatusesList,
  operationTypesList,
  historicalBalanceLookup,
  errors,

  errorsList: [
    errors.UNABLE_TO_RETRIEVE_NODE_STATUS,
    errors.UNABLE_TO_FETCH_BLOCK,
    errors.ENDPOINT_DISABLED,
    errors.UNABLE_TO_FETCH_MEMPOOL_TXS,
    errors.UNABLE_TO_FETCH_MEMPOOL_TX,
    errors.NODE_SYNCING,
    errors.UNABLE_TO_RETRIEVE_BALANCE,
    errors.INVALID_CURVE_TYPE,
    errors.UNABLE_TO_DERIVE_ADDRESS,
  ],

  operationTypes: {
    TRANSFER: LABEL_TRANSFER,
    COINBASE: LABEL_COINBASE,
  },

  operationStatuses: {
    SUCCESS: OperationStatusSuccess,
    FAILED: OperationStatusFailed,
  },
};
