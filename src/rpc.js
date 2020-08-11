const RPCClient = require('bitcoind-rpc');
const Bluebird = require('bluebird');
const Config = require('../config');

const rpcConfig = {
  protocol: Config.rpc.rpc_proto,
  user: Config.rpc.rpc_user,
  pass: Config.rpc.rpc_pass,
  host: Config.rpc.rpc_host,
  port: Config.rpc.rpc_port,
};

const rpc = new RPCClient(rpcConfig);
Bluebird.promisifyAll(rpc);

module.exports = rpc;
