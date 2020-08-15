const RosettaSDK = require('rosetta-node-sdk');

const Types = RosettaSDK.Client;

const Blockchain = 'dgb';
const Network = process.env.DGB_NETWORK || 'mainnet';
const networkIdentifier = new Types.NetworkIdentifier(Blockchain, Network);

module.exports = networkIdentifier;
