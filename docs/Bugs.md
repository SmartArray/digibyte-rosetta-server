# Bugs

## Validation issues when using Rosetta-CLI

Rosetta CLI denies to validate this block:
```json

{
  "hash": "949e5b6b384e1b596e546660ccb682a11483f5b5efa9ec94eb0da85e0d247a8b",
  "confirmations": 1,
  "strippedsize": 327,
  "size": 472,
  "weight": 1453,
  "height": 102,
  "version": 536870914,
  "versionHex": "20000002",
  "pow_algo_id": 1,
  "pow_algo": "scrypt",
  "pow_hash": "5f708d64ca4adf17ccca660d019bdbb7324c3db8c14a97a8cfb60a11f4567d4b",
  "merkleroot": "3f837c03b7c9a40e8333056f1c9e3534f363fb82bff69713edc855be6d1593f7",
  "tx": [
    {
      "txid": "6a6d05d56b04f0b662035ca2029a21d87718fa272a8514624be8de8ae93c47ba",
      "hash": "45e72e0570dc77600e66caad84c9c9d86bbc9283d9e9b7030e0b30a51c9fe27f",
      "version": 1,
      "size": 169,
      "vsize": 142,
      "weight": 568,
      "locktime": 0,
      "vin": [
        {
          "coinbase": "01660101",
          "sequence": 4294967295
        }
      ],
      "vout": [
        {
          "value": 7841.19614600,
          "n": 0,
          "scriptPubKey": {
            "asm": "0 9b3b8e478e690aced69daa67736e716b97e9ac01",
            "hex": "00149b3b8e478e690aced69daa67736e716b97e9ac01",
            "reqSigs": 1,
            "type": "witness_v0_keyhash",
            "addresses": [
              "dgbrt1qnvacu3uwdy9va45a4fnhxmn3dwt7ntqp0u4s6e"
            ]
          }
        },
        {
          "value": 0.00000000,
          "n": 1,
          "scriptPubKey": {
            "asm": "OP_RETURN aa21a9ed844fef7aa5bd988e29adfc5e82fc141f6195f1c1c5deeff9c547e19589ade61d",
            "hex": "6a24aa21a9ed844fef7aa5bd988e29adfc5e82fc141f6195f1c1c5deeff9c547e19589ade61d",
            "type": "nulldata"
          }
        }
      ],
      "hex": "010000000001010000000000000000000000000000000000000000000000000000000000000000ffffffff0401660101ffffffff0288cc2b91b60000001600149b3b8e478e690aced69daa67736e716b97e9ac010000000000000000266a24aa21a9ed844fef7aa5bd988e29adfc5e82fc141f6195f1c1c5deeff9c547e19589ade61d0120000000000000000000000000000000000000000000000000000000000000000000000000"
    },
    {
      "txid": "8053e86b2c5df6c449c6718f8221a1ee2398401e821c5ab2be244bba36cd0ba8",
      "hash": "c4201531212341c19b17f2973afe077c853fbd2af36de1b0e5e00d6413a4e3cb",
      "version": 1,
      "size": 222,
      "vsize": 141,
      "weight": 561,
      "locktime": 101,
      "vin": [
        {
          "txid": "03de079f47b01336d4798fe16418d7a0caaada52be541f73f3198043c7c64639",
          "vout": 0,
          "scriptSig": {
            "asm": "",
            "hex": ""
          },
          "txinwitness": [
            "3044022058804ca450a953d71222d92e534bf164d107904a3c2b687bbd6fae1e6d82cc7a02204b66b48cf729fe5b382bf941543d78791482f8420d5702e108bdf4daf3cebdd201",
            "02378fdb709f32cac458b064e53b78d1315e37be5fce0193081974b104d9c8815d"
          ],
          "sequence": 4294967294
        }
      ],
      "vout": [
        {
          "value": 71900.00000000,
          "n": 0,
          "scriptPubKey": {
            "asm": "0 0e5dca10c926a4620782d0a32b0787dec2bbb57a",
            "hex": "00140e5dca10c926a4620782d0a32b0787dec2bbb57a",
            "reqSigs": 1,
            "type": "witness_v0_keyhash",
            "addresses": [
              "dgbrt1qpewu5yxfy6jxypuz6z3jkpu8mmpthdt6yqu80z"
            ]
          }
        },
        {
          "value": 99.99985900,
          "n": 1,
          "scriptPubKey": {
            "asm": "0 c104aee8ddd60d7cf129878aa3ad1655e0b988c4",
            "hex": "0014c104aee8ddd60d7cf129878aa3ad1655e0b988c4",
            "reqSigs": 1,
            "type": "witness_v0_keyhash",
            "addresses": [
              "dgbrt1qcyz2a6xa6cxheuffs7928tgk2hstnzxyt4qqr4"
            ]
          }
        }
      ],
      "hex": "010000000001013946c6c7438019f3731f54be52daaacaa0d71864e18f79d43613b0479f07de030000000000feffffff02005c650d8a0600001600140e5dca10c926a4620782d0a32b0787dec2bbb57aecac0b5402000000160014c104aee8ddd60d7cf129878aa3ad1655e0b988c402473044022058804ca450a953d71222d92e534bf164d107904a3c2b687bbd6fae1e6d82cc7a02204b66b48cf729fe5b382bf941543d78791482f8420d5702e108bdf4daf3cebdd2012102378fdb709f32cac458b064e53b78d1315e37be5fce0193081974b104d9c8815d65000000"
    }
  ],
  "time": 1599562970,
  "mediantime": 1599562969,
  "nonce": 2,
  "bits": "207fffff",
  "difficulty": 4.656542373906925e-10,
  "chainwork": "00000000000000000000000000000000000000000000000000000000000000ce",
  "nTx": 2,
  "previousblockhash": "33e866e4b9bb9fecc79333d080004ad389b89fb17d82490e7e83827d4792605c"
}
```

This example can be reproduced by using toggling USE_SAFE_GENERATE to false in [docker-entrypoint.sh](../docker-entrypoint.sh) and running `npm run test-api`.
The Rosetta CLI either detects a reconcilation issue when using enabling historical balances, or it detects negative balances if fetching of historical balances is disabled.
