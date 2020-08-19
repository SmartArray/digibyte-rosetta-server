# Example Requests
'''Below are some example queries using curl:'''

### Retrieve Network Status
```bash
curl -X POST http://localhost:8080/network/status -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet"} }'
```

### Get GenesisBlock
```bash
curl -X POST http://localhost:8080/block -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet"}, "block_identifier": { "hash": "7497ea1b465eb39f1c8f507bc877078fe016d6fcb6dfad3a64c98dcc6e1e8496", "index": 0 } }'
```

### Get block with height=1
```bash
curl -X POST http://localhost:8080/block -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet"}, "block_identifier": { "hash": "4da631f2ac1bed857bd968c67c913978274d8aabed64ab2bcebc1665d7f4d3a0", "index": 1 } }'
```

### Get Mempool TxIds
```bash
curl -X POST http://localhost:8080/mempool -H 'Content-Type: application/json' -d '{"network_identifier": { "blockchain": "dgb", "network": "mainnet"}}'
```

### Get Mempool Transaction (Detail)
```bash
curl -X POST http://localhost:8080/mempool/transaction -H 'Content-Type: application/json' -d '{"network_identifier": { "blockchain": "dgb", "network": "mainnet"}, "transaction_identifier": { "hash": "46fe07f611598caf24b8efd9279f99ab230e4fd2884703e66a7fc6a861fcacb8" }}'
```

### Get Account Balance
```bash
curl -X POST -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet" }, "account_identifier": { "address": "DBUdfo4FKrdcmmEc3i6twu5hdSojKx4LxY" }}' http://localhost:8080/account/balance
```

### Get Account Balance at a specific block height
```bash
curl -X POST -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet" }, "account_identifier": { "address": "DBUdfo4FKrdcmmEc3i6twu5hdSojKx4LxY" }, "block_identifier": {"index": "100000"}}' http://localhost:8080/account/balance
```

### Get Account Balance at a specific block hash
```bash
curl -X POST -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet" }, "account_identifier": { "address": "DBUdfo4FKrdcmmEc3i6twu5hdSojKx4LxY" }, "block_identifier": {"hash": "0be8462fa449f92486972d529a9cf48c49a81c78616e7ab5959d89b313550a60"}}' http://localhost:8080/account/balance
```

### Derive Address from Public Key

```bash
curl -X POST -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet" }, "public_key": { "hex_bytes": "022CE71A795A40C1FBBED4F7868BD57FDB0D6B1CD8156C7721050A851DE7C60F9E", "curve_type": "secp256k1" } }' http://localhost:8080/construction/derive
```