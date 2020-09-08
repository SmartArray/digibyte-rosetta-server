# Livenet Data API Validation Results

Rosetta CLI has been successfully executed with a fully synced DigiByte Rosetta Node.

This configuration was used in order to validate the Data API:
```json
{
 "network": {
  "blockchain": "DigiByte",
  "network": "livenet"
 },
 "online_url": "http://localhost:8080",
 "data_directory": "digibyte-rosetta-server/data",
 "http_timeout": 10,
 "sync_concurrency": 8,
 "transaction_concurrency": 16,
 "tip_delay": 300,

 "construction": null,

 "data": {
  "historical_balance_disabled": false,
  "reconciliation_disabled": false,
  "inactive_discrepency_search_disabled": false,
  "balance_tracking_disabled": false,
  "end_conditions": {
    "index": 2500
  },
  "active_reconciliation_concurrency": 4,
  "inactive_reconciliation_concurrency": 4
 }
}	
```

which resulted in the following output:

```
master@digiassetsd:~/rosetta$ ./bin/rosetta-cli check:data --configuration-file dgb.conf 
loaded configuration file: dgb.conf
2020/09/08 11:52:09 Loading previously seen accounts (this could take a while)...
Initialized reconciler with 0 previously seen accounts
2020/09/08 11:52:09 Syncing 0-2500
[STATS] Blocks: 181 (Orphaned: 0) Transactions: 181 Operations: 180 Reconciliations: 180 (Inactive: 0, Coverage: 100.000000%)
[STATS] Blocks: 364 (Orphaned: 0) Transactions: 364 Operations: 363 Reconciliations: 369 (Inactive: 112, Coverage: 100.000000%)
[STATS] Blocks: 557 (Orphaned: 0) Transactions: 558 Operations: 557 Reconciliations: 542 (Inactive: 251, Coverage: 99.557522%)
[STATS] Blocks: 730 (Orphaned: 0) Transactions: 730 Operations: 729 Reconciliations: 759 (Inactive: 423, Coverage: 99.557522%)
[STATS] Blocks: 910 (Orphaned: 0) Transactions: 910 Operations: 909 Reconciliations: 961 (Inactive: 580, Coverage: 100.000000%)
[STATS] Blocks: 1070 (Orphaned: 0) Transactions: 1073 Operations: 1377 Reconciliations: 1207 (Inactive: 685, Coverage: 99.632353%)
[STATS] Blocks: 1217 (Orphaned: 0) Transactions: 1223 Operations: 1530 Reconciliations: 1465 (Inactive: 852, Coverage: 99.699700%)
[STATS] Blocks: 1366 (Orphaned: 0) Transactions: 1372 Operations: 1679 Reconciliations: 1726 (Inactive: 1056, Coverage: 100.000000%)
[STATS] Blocks: 1519 (Orphaned: 0) Transactions: 1527 Operations: 1839 Reconciliations: 1967 (Inactive: 1206, Coverage: 99.728997%)
[STATS] Blocks: 1646 (Orphaned: 0) Transactions: 1654 Operations: 1966 Reconciliations: 2271 (Inactive: 1417, Coverage: 100.000000%)
[STATS] Blocks: 1776 (Orphaned: 0) Transactions: 1784 Operations: 2096 Reconciliations: 2558 (Inactive: 1575, Coverage: 99.827288%)
[STATS] Blocks: 1893 (Orphaned: 0) Transactions: 1900 Operations: 2212 Reconciliations: 2917 (Inactive: 1817, Coverage: 99.856322%)
[STATS] Blocks: 2001 (Orphaned: 0) Transactions: 2009 Operations: 2320 Reconciliations: 3273 (Inactive: 2065, Coverage: 99.875622%)
[STATS] Blocks: 2109 (Orphaned: 0) Transactions: 2117 Operations: 2429 Reconciliations: 3632 (Inactive: 2315, Coverage: 100.000000%)
[STATS] Blocks: 2181 (Orphaned: 0) Transactions: 2189 Operations: 2501 Reconciliations: 4026 (Inactive: 2637, Coverage: 99.898271%)
[STATS] Blocks: 2267 (Orphaned: 0) Transactions: 2285 Operations: 2618 Reconciliations: 4427 (Inactive: 2941, Coverage: 100.000000%)
[STATS] Blocks: 2338 (Orphaned: 0) Transactions: 2406 Operations: 2851 Reconciliations: 4804 (Inactive: 3125, Coverage: 99.913345%)
[STATS] Blocks: 2389 (Orphaned: 0) Transactions: 2508 Operations: 3066 Reconciliations: 5291 (Inactive: 3389, Coverage: 99.363057%)
[STATS] Blocks: 2435 (Orphaned: 0) Transactions: 2632 Operations: 3352 Reconciliations: 5734 (Inactive: 3600, Coverage: 99.926036%)
[STATS] Blocks: 2470 (Orphaned: 0) Transactions: 2762 Operations: 3691 Reconciliations: 6203 (Inactive: 3758, Coverage: 99.864407%)
2020/09/08 11:55:37 Finished syncing 0-2500
[STATS] Blocks: 2501 (Orphaned: 0) Transactions: 2880 Operations: 3999 Reconciliations: 6604 (Inactive: 3876, Coverage: 99.936588%)

Success: Index End Condition [Index: 2500]

+--------------------+--------------------------------+--------+
|  CHECK:DATA TESTS  |          DESCRIPTION           | STATUS |
+--------------------+--------------------------------+--------+
| Request/Response   | Rosetta implementation         | PASSED |
|                    | serviced all requests          |        |
+--------------------+--------------------------------+--------+
| Response Assertion | All responses are correctly    | PASSED |
|                    | formatted                      |        |
+--------------------+--------------------------------+--------+
| Block Syncing      | Blocks are connected into a    | PASSED |
|                    | single canonical chain         |        |
+--------------------+--------------------------------+--------+
| Balance Tracking   | Account balances did not go    | PASSED |
|                    | negative                       |        |
+--------------------+--------------------------------+--------+
| Reconciliation     | No balance discrepencies were  | PASSED |
|                    | found between computed and     |        |
|                    | live balances                  |        |
+--------------------+--------------------------------+--------+

+--------------------------+--------------------------------+------------+
|     CHECK:DATA STATS     |          DESCRIPTION           |   VALUE    |
+--------------------------+--------------------------------+------------+
| Blocks                   | # of blocks synced             |       2501 |
+--------------------------+--------------------------------+------------+
| Orphans                  | # of blocks orphaned           |          0 |
+--------------------------+--------------------------------+------------+
| Transactions             | # of transaction processed     |       2880 |
+--------------------------+--------------------------------+------------+
| Operations               | # of operations processed      |       3999 |
+--------------------------+--------------------------------+------------+
| Active Reconciliations   | # of reconciliations performed |       2728 |
|                          | after seeing an account in a   |            |
|                          | block                          |            |
+--------------------------+--------------------------------+------------+
| Inactive Reconciliations | # of reconciliation performed  |       3876 |
|                          | on randomly selected accounts  |            |
+--------------------------+--------------------------------+------------+
| Reconciliation Coverage  | % of accounts that have been   | 99.936588% |
|                          | reconciled                     |            |
+--------------------------+--------------------------------+------------+

master@digiassetsd:~/rosetta$ 

```
