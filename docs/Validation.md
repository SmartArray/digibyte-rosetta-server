## How to validate Account Balance Retrieval?
[cryptoID](https://chainz.cryptoid.info/) offers a great service when it comes to investigating history balances for different coins.

### Validate an address with many transactions
Consider this public address DCzmzkMBqEz2tLn47W9YuNAV9cFzuWCydW.
As of 05. September, 2020 this address contains 399195 transactions. Fairly a lot.

The following `curl` command may take several seconds
```bash
curl -X POST -H 'Content-Type: application/json' -d '{ "network_identifier": { "blockchain": "dgb", "network": "mainnet" }, "account_identifier": { "address": "DCzmzkMBqEz2tLn47W9YuNAV9cFzuWCydW" }}' http://127.0.0.1:8080/account/balance
```

and yields this output:
```
{
    "block_identifier": {
        "index": 11489180,
        "hash": "00000000000000000915d818baeeb9cffb3e497e776cddb3a7045186d06731ca"
    },
    "balances": [
        {
            "value": "463275000",
            "currency": {
                "symbol": "DGB",
                "decimals": 8
            }
        }
    ]
} 
```    

which can be validated by looking at this url: [History Balances](https://chainz.cryptoid.info/dgb/address.dws?DCzmzkMBqEz2tLn47W9YuNAV9cFzuWCydW.htm)

Even after a block reorg (which occur several times a day) the balance remains correct.
By specifiying a block identifier in the request, history balances can be easily retrieved.
