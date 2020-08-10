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
curl -X POST http://localhost:8080/mempool -H 'Content-Type: application/json' -d '{"network_identifier": { "blockchain": "dgb", "network": "mainnet"}, "transaction_identifier": { "hash": "46fe07f611598caf24b8efd9279f99ab230e4fd2884703e66a7fc6a861fcacb8" }}'
```