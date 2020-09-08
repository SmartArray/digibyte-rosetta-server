const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const Config = require('../config');
const Constants = require('./constants');
const DigiByteIndexer = require('./digibyteIndexer');

const OperationTypes = Config.serverConfig.operationTypes;
const OperationStatus = Config.serverConfig.operationStatuses;
const { currency } = Config.serverConfig;

const blockMetadata = (block, data_available) => {
  const ret = {};

  ret.nonce = block.nonce;
  ret.nTx = block.nTx;
  ret.pow_algo = block.pow_algo;
  ret.pow_hash = block.pow_hash;
  ret.version = block.version;
  ret.merkleroot = block.merkleroot;

  if (data_available != null) {
    ret.data_available = data_available;
  }

  return ret;
};

const txOperations = async (tx, isMempoolTx = false) => {
  const ret = [];
  let operationId = 0;

  // ToDo: Pending state?
  const status = isMempoolTx ? OperationStatus.SUCCESS.status : OperationStatus.SUCCESS.status;

  for (let input of tx.vin) {
    if (input.coinbase) {
      continue;
    }

    // Inputs:
    //   inputs are spent from accounts (negative amounts)
    const { txid, vout } = input;

    // Get the utxo data from utxo indexer
    const data = await DigiByteIndexer.getUtxoData(txid, vout);
    if (data == null || !data.address) continue;

    const nextOperationId = operationId++;

    ret.push(Types.Operation.constructFromObject({
      operation_identifier: new Types.OperationIdentifier(nextOperationId),
      type: OperationTypes.TRANSFER,
      status,
      account: new Types.AccountIdentifier(data.address),
      amount: Types.Amount.constructFromObject({
        value: -parseInt(data.sats),
        currency,
      }),
    }));
  }

  // Outputs:
  //   outputs receive balances (positive amounts)
  for (let output of tx.vout) {
    if (!output.scriptPubKey || output.scriptPubKey.type == 'nonstandard') return;

    if (!Array.isArray(output.scriptPubKey.addresses)
        || output.scriptPubKey.addresses.length != 1) {
      // ToDo: Handle Multisig
      return;
    }

    const address = output.scriptPubKey.addresses[0];
    const nextOperationId = operationId++;

    let trig = false;

    ret.push(Types.Operation.constructFromObject({
      operation_identifier: new Types.OperationIdentifier(nextOperationId),
      type: OperationTypes.TRANSFER,
      status,
      account: new Types.AccountIdentifier(address),
      amount: Types.Amount.constructFromObject({
        value: parseInt(Math.round(output.value * Constants.SATOSHIS)),
        currency,
      }),
    }));
  }

  return ret;
};

const txMetadata = (tx) => {
  const ret = {};

  ret.version = tx.version;
  ret.locktime = tx.locktime;
  ret.size = tx.size;

  return ret;
};

const transactionToRosettaType = async function (tx, isMempoolTx = false) {
  const typedTx = Types.Transaction.constructFromObject({
    transaction_identifier: new Types.TransactionIdentifier(tx.txid),
    operations: await txOperations(tx, isMempoolTx),
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
