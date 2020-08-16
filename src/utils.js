const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const Config = require('../config');
const Constants = require('./constants');
const DigiByteSyncer = require('./digibyteSyncer');

const OperationTypes = Config.serverConfig.operationTypes;
const OperationStatus = Config.serverConfig.operationStatuses;
const { currency } = Config.serverConfig;

const blockMetadata = (block) => {
  const ret = {};

  ret.nonce = block.nonce;
  ret.nTx = block.nTx;
  ret.pow_algo = block.pow_algo;
  ret.pow_hash = block.pow_hash;
  ret.version = block.version;
  ret.merkleroot = block.merkleroot;

  return ret;
};

const txOperations = (tx, isMempoolTx = false) => {
  const ret = [];
  let operationId = 0;

  // ToDo: Pending state?
  const status = isMempoolTx ? OperationStatus.SUCCESS.status : OperationStatus.SUCCESS.status;

  tx.vin.forEach((vin) => {
    if (vin.coinbase && tx.vin.length == 1) {
      // Coinbase TX (generated new coins).
      // Create a COINBASE Operation for every output:

      tx.vout.forEach((output) => {
        if (!output.scriptPubKey) return;
        if (output.scriptPubKey.type == 'nonstandard') return;

        if (!Array.isArray(output.scriptPubKey.addresses)
            || output.scriptPubKey.addresses.length > 1) {
          // ToDo: Handle Multisig
          return;
        }

        const address = output.scriptPubKey.addresses[0];

        ret.push(Types.Operation.constructFromObject({
          operation_identifier: operationId++,
          type: OperationTypes.COINBASE,
          status,
          account: new Types.AccountIdentifier(address),
          amount: Types.Amount.constructFromObject({
            value: parseInt(output.value * Constants.SATOSHIS),
            currency,
          }),
          // metadata: {},
        }));
      });
    } else {
      // Transfer
      tx.vout.forEach((output) => {
        if (!Array.isArray(output.scriptPubKey.addresses) || output.scriptPubKey.addresses.length != 1) {
          // ToDo: Handle Multisig
          return;
        }

        const address = output.scriptPubKey.addresses[0];
        const nextOperationId = operationId++;

        ret.push(Types.Operation.constructFromObject({
          operation_identifier: nextOperationId,
          // related_operations: [],
          type: OperationTypes.TRANSFER,
          status,
          account: new Types.AccountIdentifier(address),
          amount: Types.Amount.constructFromObject({
            value: parseInt(output.value * Constants.SATOSHIS),
            currency,
          }),
          // metadata: {},
        }));

        // txindex=1 must be set in order to get the address
        // of an input. The following commented code is untested,
        // but it should work.
        //
        // if (tx.vin.length == 1) {
        //   ret.push(Types.Operation.constructFromObject({
        //     operation_identifier: operationId++,
        //     related_operations: [nextOperationId],
        //     type: OperationTypes.TRANSFER,
        //     status: OperationStatus.SUCCESS.status,
        //     account: new Types.AccountIdentifier(address),
        //     amount: Types.Amount.constructFromObject({
        //       value: -parseInt(output.value * Constants.SATOSHIS),
        //       currency: currency,
        //     }),
        //     // metadata: {},
        //   }));
        // }
      });
    }
  });

  return ret;
};

const txMetadata = (tx) => {
  const ret = {};

  ret.version = tx.version;
  ret.locktime = tx.locktime;
  ret.size = tx.size;

  return ret;
};

const transactionToRosettaType = function (tx, isMempoolTx = false) {
  const typedTx = Types.Transaction.constructFromObject({
    transaction_identifier: new Types.TransactionIdentifier(tx.txid),
    operations: txOperations(tx, isMempoolTx),
    metadata: txMetadata(tx),
  });

  return typedTx;
};

module.exports = {
  blockMetadata,
  txOperations,
  txMetadata,
  transactionToRosettaType,
};
