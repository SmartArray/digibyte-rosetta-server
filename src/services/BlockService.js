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

const Types = RosettaSDK.Client;

const rpc = require('../rpc');
const utils = require('../utils');
const Config = require('../../config');
const Errors = require('../../config/errors');

const SyncBlockCache = require('../syncBlockCache');
const DigiByteSyncer = require('../digibyteSyncer');
const DigiByteIndexer = require('../digibyteIndexer');

/* Data API: Block */

/**
* Get a Block
* Get a block by its Block Identifier. If transactions are returned in the same call to the node as fetching the block, the response should include these transactions in the Block object. If not, an array of Transaction Identifiers should be returned so /block/transaction fetches can be done to get all transaction information.
*
* blockRequest BlockRequest
* returns BlockResponse
* */
const block = async (params, req) => {
  const { blockRequest } = params;

  let blockData;
  let parentBlock;  
  let transactions;

  /**
   * Check if only the block index was specified during the BlockRequest.
   * In that case, the block hash will be retrieved using direct rpc call
   */
  if (blockRequest.block_identifier.index != null && !blockRequest.block_identifier.hash) {
    SyncBlockCache.get('')
    const hashResponse = await rpc.getBlockHashAsync(blockRequest.block_identifier.index);
    blockRequest.block_identifier.hash = hashResponse.result;
  }

  /**
   * Get the block data using rpc call, unless it was found in a local block cache.
   * Return COULD_NOT_FETCH_BLOCK (retriable) if for some reason the request failed. 
   */
  blockData = SyncBlockCache.get(blockRequest.block_identifier.hash);
  if (blockData == null) {
    const blockResponse = await rpc.getBlockAsync(blockRequest.block_identifier.hash, 2);

    blockData = blockResponse.result;
    if (!blockData) {
      throw Errors.COULD_NOT_FETCH_BLOCK;
    }

    /**
     * Save the block in the block cache, so that the internal syncer
     * can still use the original data in order to index the utxo set.
     */
    SyncBlockCache.put(
      blockData.hash,
      blockData,
    );    
  }

  /**
   * If the correct secret is set, this request is a request made by the
   * utxo indexer.
   */
  const isSyncerRequest = req.headers['syncer-secret'] == Config.syncer.syncerSecret;
  const requestedDataAvailable = DigiByteIndexer.safeLastBlockSymbol >= blockData.height;  

  /**
   * Create a Full Block Identifier according to the Rosetta spec.
   */
  const queriedBlock = new Types.BlockIdentifier(
    blockData.height,
    blockData.hash,
  );

  /**
   * Generate the correct parent block identifier according to the
   * Rosetta guidelines.
   */
  if (queriedBlock.index == 0) {
    parentBlock = new Types.BlockIdentifier(
      blockData.height,
      blockData.hash,
    );
  } else {
    parentBlock = new Types.BlockIdentifier(
      blockData.height - 1,
      blockData.previousblockhash,
    );
  }

  if (requestedDataAvailable) {
    /**
     * Process transaction operations if the requested data
     * was already indexed by the utxo syncer.
     */    
    transactions = await Promise.all(
      blockData.tx.map((tx) => utils.transactionToRosettaType(tx))
    );

  } else if (!isSyncerRequest) {
    /**
     * Exit if the utxo syncer hasn't indexed the requested block height.
     * This error won't be thrown if the request was made by the syncer.
     */
    throw Errors.NODE_SYNCING.addDetails({
      syncedTo: DigiByteIndexer.safeLastBlockSymbol,
    });
  }

  /**
   * Construct the block object that is required in the BlockResponse.
   */
  const block = Types.Block.constructFromObject({
    block_identifier: queriedBlock,
    parent_block_identifier: parentBlock,
    timestamp: blockData.time * 1000,
    transactions,
    metadata: utils.blockMetadata(blockData, requestedDataAvailable),
  });

  const otherTransactions = [];
  return new Types.BlockResponse(block, otherTransactions);
};

/**
* Get a Block Transaction
* Get a transaction in a block by its Transaction Identifier. This endpoint should only be used when querying a node for a block does not return all transactions contained within it.  All transactions returned by this endpoint must be appended to any transactions returned by the /block method by consumers of this data. Fetching a transaction by hash is considered an Explorer Method (which is classified under the Future Work section).  Calling this endpoint requires reference to a BlockIdentifier because transaction parsing can change depending on which block contains the transaction. For example, in Bitcoin it is necessary to know which block contains a transaction to determine the destination of fee payments. Without specifying a block identifier, the node would have to infer which block to use (which could change during a re-org).  Implementations that require fetching previous transactions to populate the response (ex: Previous UTXOs in Bitcoin) may find it useful to run a cache within the Rosetta server in the /data directory (on a path that does not conflict with the node).
*
* blockTransactionRequest BlockTransactionRequest
* returns BlockTransactionResponse
* */
// eslint-disable-next-line no-unused-vars
const blockTransaction = async (params) => {
  throw Errors.ENDPOINT_DISABLED;
};

module.exports = {
  /* /block */
  block,

  /* /block/transaction */
  blockTransaction,
};
