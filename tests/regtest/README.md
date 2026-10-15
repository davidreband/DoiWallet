# Regtest tests

These tests build transactions with the real wallet classes and ask a local **Doichain Core v31.1.6**
regtest node whether it accepts them.

## Why they exist

For name operations, "does it look right" is not a useful answer. Doichain Core accepts a name output
whatever its owner script says, so a name handed to an address the wallet cannot spend from is
accepted, confirmed, and then lost together with the 0.01 DOI locked in it — that is
[#36](https://github.com/Doichain/DoiWallet/issues/36), and no unit test would have caught it.
The rules around a name *input* fail the other way: the transaction is simply rejected, with a reject
reason (`tx-name-greedy`, `tx-namedoi-overwrite-without-input`, `min relay fee not met`) that is hard
to predict from the code alone.

Only a node can settle those questions, so these tests ask one.

## Running them

```bash
./scripts/regtest-node.sh start   # downloads Core once, starts the node, mines spendable coins
npm run regtest
```

Without a running node the suite **skips** instead of failing, so `npm test` stays green on a machine
that has no node.

Other commands:

```bash
./scripts/regtest-node.sh status      # up or down, and at which height
./scripts/regtest-node.sh stop        # stop, keep the chain
./scripts/regtest-node.sh reset       # stop and wipe the chain, keep the binaries
./scripts/regtest-node.sh cli name_show somename   # anything else goes straight to doichain-cli
```

Everything lives under `.regtest/` in the project (gitignored). `~/.doichain` is never touched, so an
existing mainnet node and its wallets are safe. The RPC port is 19443, which does not clash with
mainnet (8339) or the default regtest port.

## How the wallet is pointed at regtest

The wallet classes read their network parameters from `blue_modules/network.js`, so the suite mocks
that module and swaps `DOICHAIN` for the regtest parameters. A real `HDSegwitBech32Wallet` then
derives `ncrt1q…` addresses that the node accepts.

The BIP32 serialization prefixes deliberately stay the mainnet ones: `_zpubToXpub()` rewrites a zpub
with a hardcoded `0488b21e` (upstream BlueWallet code, and correct on mainnet, where Doichain uses
that same prefix), so a regtest prefix would only make `bip32.fromBase58()` reject our own xpub. The
prefix decides how an extended key is written down, not which keys or addresses come out of it.

## What the scenarios stand in for

`fetchUtxo()` and `fetchTransactions()` normally fill the wallet from an Electrum server. There is no
ElectrumX in this setup, so the tests set `_utxo` and `getTransactions()` themselves from what the
node reports. Everything downstream of that — coin selection, the name input lookup, script building,
signing — is the wallet's own code.

## Adding a scenario

Keep the question a node has to answer. A check that needs no node belongs in `tests/unit/`, which
runs everywhere and in CI; `tests/unit/getNameOPStackScript.test.ts` pins the name script byte for
byte against the fixtures of `@doichain/doichainjs-lib`, and that is the right place for that kind of
assertion.
