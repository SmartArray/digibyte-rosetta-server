<p align="center">
  <a href="https://www.rosetta-api.org">
    <img width="90%" alt="Rosetta" src="https://www.rosetta-api.org/img/rosetta_header.png">
  </a>
</p>
<h3 align="center">
   DigiByte Rosetta Server (beta)
</h3>
<p align="center">
DigiByte Rosetta Node offering a unified API according to the standard proposed by Coinbase.
</p>

> This implementation is a Proof-of-Concept implementation for the [NodeJS Rosetta SDK](https://github.com/SmartArray/digibyte-rosetta-nodeapi/tree/1.4.1) developed by DigiByte

## Prerequisites
1. Install docker and git for your system

## Docker Build Steps
1. Clone the container using git
```bash
git clone https://github.com/SmartArray/digibyte-rosetta-server.git
```
2. Build the docker container
```bash
# Build the docker container for testnet (may take a while).
# Other build args are documented in ./Dockerfile
cd digibyte-rosetta-server
docker build -t digibyte/rosetta:latest --build-arg use_testnet=1 .
```
3. Start the docker container
```bash
# This command will start the docker container.
# In this example, docker will forward two ports: 8080, and 12026.
# Port 8080/tcp is the port of the rosetta api server.
# Port 12026/tcp is the p2p testnet port.
# If you are using mainnet, make sure you replace the port 12026 with 12024.
docker run -p 12026:12026 -p 8080:8080 digibyte/rosetta:latest
```

## Test
To have some example requests to test the reachability of your node using curl, have a look at the document [Example Requests](./docs/ExampleRequests.md).

## Current State
Currently, only the [Rosetta Data API](https://www.rosetta-api.org/docs/data_api_introduction.html) is implemented by this node. The Construction API will be completed soon.

## ToDos
- [ ] Implement Construction API for Offline and Online Environments
- [ ] Test the node using coinbase's [rosetta-cli](https://github.com/coinbase/rosetta-cli.git)
- [ ] Run the mainnet node and wait for full sync
- [ ] Test some utxo balance checks
- [ ] Setup automated tests
