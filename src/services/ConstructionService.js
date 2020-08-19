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

const {
  Address,
  PublicKey,
  Networks,
  Transaction,
} = require('bitcore-lib');

const Config = require('../../config');
const CustomNetworks = require('../CustomNetworks');
const Network = CustomNetworks[Config.network];

const rpc = require('../rpc');
const Errors = require('../../config/errors');
const DigiByteIndexer = require('../digibyteIndexer');

const Types = RosettaSDK.Client;

Networks.add(Network);
Networks.defaultNetwork = Network.name;

/* Construction API */

/**
* Get Transaction Construction Metadata
* Get any information required to construct a transaction for a specific network. Metadata returned here could be a recent hash to use, an account sequence number, or even arbitrary chain state. It is up to the client to correctly populate the options object with any network-specific details to ensure the correct metadata is retrieved.  It is important to clarify that this endpoint should not pre-construct any transactions for the client (this should happen in the SDK). This endpoint is left purposely unstructured because of the wide scope of metadata that could be required.  In a future version of the spec, we plan to pass an array of Rosetta Operations to specify which metadata should be received and to create a transaction in an accompanying SDK. This will help to insulate the client from chain-specific details that are currently required here.
*
* constructionMetadataRequest ConstructionMetadataRequest
* returns ConstructionMetadataResponse
* */
const constructionMetadata = async (params) => {
  const { constructionMetadataRequest } = params;
  const { options } = constructionMetadataRequest;

  if (!options || !Array.isArray(options.required_balances) ||
    options.required_balances.length == 0) throw Errors.EXPECTED_REQUIRED_ACCOUNTS;

  // ToDo: require change address?

  const relevantInputs = [];
  let change = 0;

  for (let requiredBalance of options.required_balances) {
    const { account, amount } = requiredBalance;

    if (amount < 0) {
      // Get the utxos accociated with that address.
      const outputs = await DigiByteIndexer.getAccountOutputs(account);

      /**
       * Collect as many outputs as we need to fulfill
       * the requested balance operation.
       */
      let missing = -amount;

      for (let output of outputs) {
        if (missing >= 0) continue;
        missing += output.sats;

        /**
         * Add this utxo to the relevant ones.
         */
        relevantInputs.push({
          txid: output.txid,
          vout: output.vout,
        });
      }

      // Can not fulfill the request.
      if (missing < 0) {
        throw Errors.INSUFFICIENT_BALANCE.addDetails({
          for_account: account,
        });
      }

      // Utxos gave too many satoshis. Add the difference to the change.
      if (missing > 0) {
        change += missing;
      }
    }
  }

  // Return no metadata to work with
  return Types.ConstructionMetadataResponse.constructFromObject({
    metadata: {
      relevant_inputs: relevantInputs,
      change,
    },
  });
};

/**
* Submit a Signed Transaction
* Submit a pre-signed transaction to the node. This call should not block on the transaction being included in a block. Rather, it should return immediately with an indication of whether or not the transaction was included in the mempool.  The transaction submission response should only return a 200 status if the submitted transaction could be included in the mempool. Otherwise, it should return an error.
*
* constructionSubmitRequest ConstructionSubmitRequest
* returns ConstructionSubmitResponse
* */
const constructionSubmit = async (params) => {
  const { constructionSubmitRequest } = params;
  return {};
};

/**
* Create Network Transaction from Signatures
* Combine creates a network-specific transaction from an unsigned transaction and an array of provided signatures. The signed transaction returned from this method will be sent to the `/construction/submit` endpoint by the caller.
*
* constructionCombineRequest ConstructionCombineRequest
* returns ConstructionCombineResponse
* */
const constructionCombine = async (params) => {
  const { constructionCombineRequest } = params;
  return {};
};

/**
* Derive an Address from a PublicKey
* Derive returns the network-specific address associated with a public key. Blockchains that require an on-chain action to create an account should not implement this method.
*
* constructionDeriveRequest ConstructionDeriveRequest
* returns ConstructionDeriveResponse
* */
const constructionDerive = async (params) => {
  const { constructionDeriveRequest } = params;
  const { public_key, network_identifier } = constructionDeriveRequest;

  if (public_key.curve_type != 'secp256k1') {
    return Errors.INVALID_CURVE_TYPE;
  }

  try {
    const pubKey = new PublicKey(public_key.hex_bytes);
    const address = Address.fromPublicKey(pubKey); // , undefined, 'witnesspubkeyhash');
    return new Types.ConstructionDeriveResponse(address.toString());

  } catch (e) {
    console.error(e);
    return Errors.UNABLE_TO_DERIVE_ADDRESS
      .addDetails({ reason: e.message });
  }
};

/**
* Get the Hash of a Signed Transaction
* TransactionHash returns the network-specific transaction hash for a signed transaction.
*
* constructionHashRequest ConstructionHashRequest
* returns TransactionIdentifierResponse
* */
const constructionHash = async (params) => {
  const { constructionHashRequest } = params;
  return {};
};

/**
* Parse a Transaction
* Parse is called on both unsigned and signed transactions to understand the intent of the formulated transaction. This is run as a sanity check before signing (after `/construction/payloads`) and before broadcast (after `/construction/combine`).
*
* constructionParseRequest ConstructionParseRequest
* returns ConstructionParseResponse
* */
const constructionParse = async (params) => {
  const { constructionParseRequest } = params;
  return {};
};

/**
* Generate an Unsigned Transaction and Signing Payloads
* Payloads is called with an array of operations and the response from `/construction/metadata`. It returns an unsigned transaction blob and a collection of payloads that must be signed by particular addresses using a certain SignatureType. The array of operations provided in transaction construction often times can not specify all \"effects\" of a transaction (consider invoked transactions in Ethereum). However, they can deterministically specify the \"intent\" of the transaction, which is sufficient for construction. For this reason, parsing the corresponding transaction in the Data API (when it lands on chain) will contain a superset of whatever operations were provided during construction.
*
* constructionPayloadsRequest ConstructionPayloadsRequest
* returns ConstructionPayloadsResponse
* */
const constructionPayloads = async (params) => {
  const { constructionPayloadsRequest } = params;
  const { metadata } = constructionPayloadsRequest;

  if (!metadata || !Array.isArray(metadata.relevant_inputs) ||
    metadata.relevant_inputs.length == 0) throw Errors.EXPECTED_RELEVANT_INPUTS;

  const transaction = new Transaction()
    .from(metadata.relevant_inputs);



  return {};
};

/**
* Create a Request to Fetch Metadata
* Preprocess is called prior to `/construction/payloads` to construct a request for any metadata that is needed for transaction construction given (i.e. account nonce). The request returned from this method will be used by the caller (in a different execution environment) to call the `/construction/metadata` endpoint.
*
* constructionPreprocessRequest ConstructionPreprocessRequest
* returns ConstructionPreprocessResponse
* */
const constructionPreprocess = async (params) => {
  const { constructionPreprocessRequest } = params;
  const { operations } = constructionPreprocessRequest;

  const requiredAmountForAccount = {};
  const requiredBalances = [];

  for (let operation of operations) {
    const { address } = operation.account_identifier;
    const amount = parseInt(operation.amount.value);

    // Skip if receiving address.
    if (amount >= 0) continue;

    const positiveAmount = -amount;

    /**
     * Group the required amount to the relevant account.
     */
    requiredAmountForAccount[address] = requiredAmountForAccount[address] || { sats: 0 };
    requiredAmountForAccount[address].sats += positiveAmount;
  }

  for (let account of Object.keys(requiredAmountForAccount)) {
    requiredBalances.push({
      account, 
      amount: requiredAmountForAccount[account]
    });
  }

  return Types.ConstructionPreprocessResponse().constructFromObject({
    options: {
      required_balances: requiredBalances,
    },
  })
};

module.exports = {
  /* /construction/metadata */
  constructionMetadata,

  /* /construction/submit */
  constructionSubmit,

  /* /construction/combine */
  constructionCombine,

  /* /construction/derive */
  constructionDerive,

  /* /construction/hash */
  constructionHash,

  /* /construction/parse */
  constructionParse,

  /* /construction/payloads */
  constructionPayloads,

  /* /construction/preprocess */
  constructionPreprocess,
};
