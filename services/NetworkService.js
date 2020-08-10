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

const Config = require('../config');
const rpc = require('../rpc');
const Errors = require('../config/errors');

/* Data API: Network */

/**
* Get List of Available Networks
* This endpoint returns a list of NetworkIdentifiers that the Rosetta server can handle.
*
* metadataRequest MetadataRequest 
* returns NetworkListResponse
* */
const networkList = async (params) => {
  const { metadataRequest } = params;

  const response = new Types.NetworkListResponse(
    Config.serverConfig.networkIdentifiers,
  );

  return response;
};

/**
* Get Network Options
* This endpoint returns the version information and allowed network-specific types for a NetworkIdentifier. Any NetworkIdentifier returned by /network/list should be accessible here.  Because options are retrievable in the context of a NetworkIdentifier, it is possible to define unique options for each network.
*
* networkRequest NetworkRequest 
* returns NetworkOptionsResponse
* */
const networkOptions = async (params) => {
  const { networkRequest } = params;

  const version = new Types.Version(
    Config.rosettaVersion,
    Config.digibyteVersion,
  );

  const allow = new Types.Allow(
    Config.serverConfig.operationStatusesList,
    Config.serverConfig.operationTypesList,
    Config.serverConfig.errorsList,
    Config.serverConfig.historicalBalanceLookup,
  );

  return new Types.NetworkOptionsResponse(version, allow);
};

/**
* Get Network Status
* This endpoint returns the current status of the network requested. Any NetworkIdentifier returned by /network/list should be accessible here.
*
* networkRequest NetworkRequest 
* returns NetworkStatusResponse
* */
const networkStatus = async (params) => {
  const { networkRequest } = params;

  let currentBlockIdentifier;
  let currentBlockTimestamp;
  let genesisBlockIdentifier;
  let peers;

  try {
    const info = await rpc.getBlockchainInfoAsync();
    currentBlockIdentifier = new Types.BlockIdentifier(
      info.result.blocks, // height
      info.result.bestblockhash, // hash
    );

    const bestBlock = await rpc.getBlockAsync(currentBlockIdentifier.hash, 1);
    currentBlockTimestamp = bestBlock.result.time * 1000; // milliseconds

    const genesisBlock = await rpc.getBlockHashAsync(0);
    genesisBlockIdentifier = new Types.BlockIdentifier(
      0, // index: 0
      genesisBlock.result, // hash
    );

    const peersData = await rpc.getPeerInfoAsync();
    peers = peersData.result.map(p => 
      Types.Peer.constructFromObject({
        peer_id: p.id,
        metadata: {
          addr: p.addr,
          version: p.version,
          subver: p.subver,
        },
      })
    );
  } catch (e) {
    console.error(e);
    throw Errors.UNABLE_TO_RETRIEVE_NODE_STATUS;
  }

  return new Types.NetworkStatusResponse(
    currentBlockIdentifier,
    currentBlockTimestamp,
    genesisBlockIdentifier,
    peers,
  );
};

module.exports = {
  /* /network/list */
  networkList,

  /* /network/options */
  networkOptions,

  /* /network/status */
  networkStatus,
};
