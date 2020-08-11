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
const DigiByteIndexer = require('../digibyteIndexer');
const config = require('../../config');
const rpc = require('../rpc');

const Types = RosettaSDK.Client;
/* Data API: Account */

/**
* Get an Account Balance
* Get an array of all Account Balances for an Account Identifier and the Block Identifier at which the balance lookup was performed.  Some consumers of account balance data need to know at which block the balance was calculated to reconcile account balance changes.  To get all balances associated with an account, it may be necessary to perform multiple balance requests with unique Account Identifiers.  If the client supports it, passing nil AccountIdentifier metadata to the request should fetch all balances (if applicable).  It is also possible to perform a historical balance lookup (if the server supports it) by passing in an optional BlockIdentifier.
*
* accountBalanceRequest AccountBalanceRequest 
* returns AccountBalanceResponse
* */
const balance = async (params) => {
  const { accountBalanceRequest } = params;

  const address = accountBalanceRequest.account_identifier.address;
  let atBlock;

  if (accountBalanceRequest.block_identifier) {
    atBlock = accountBalanceRequest.block_identifier.index || accountBalanceRequest.block_identifier.hash;
  }

  try {
    const accountData = DigiByteIndexer.getAccountBalance(address, atBlock);
    const balance = accountData.balance;
    const blockIdentifier = new Types.BlockIdentifier();

    if (atBlock) {
      blockIdentifier.index = lastBlockSymbol;
      blockIdentifier.hash = bestBlockHash;
    } else {
      blockIdentifier.index = accountBalanceRequest.block_identifier.index || accountData.blockSymbol;
      blockIdentifier.hash = accountBalanceRequest.block_identifier.hash;

      if (!blockIdentifier.hash) {
        blockIdentifier.hash = await rpc.getBlockHashAsync(blockRequest.block_identifier.index);
      }
    }

    const balances = [
      new Types.Amount(
        balance.toFixed(0),
        config.serverConfig.currency,
      ),
    ];

    return new Types.AccountBalanceResponse(
      blockIdentifier,
      balances,
    );

  } catch(e) {
    const error = new Types.Error();
    return error;
  }
};

module.exports = {
  /* /account/balance */
  balance,
};
