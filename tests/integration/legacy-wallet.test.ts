import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';
import { LegacyWallet, SegwitBech32Wallet, SegwitP2SHWallet } from '../../class';

jest.setTimeout(30 * 1000);

/**
 * A single address that holds seven names (Fulda, Wien, Braunau, Salzburg, Muenchen, Zuerich and
 * one more) alongside its coins. The tests used to compare its balance and transaction count
 * against what they were when they were written - 9948820 and 2 - and both have long since been
 * overtaken by the chain, so they now assert what stays true as it moves on.
 */
const NAME_HOLDER = 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e';

afterAll(async () => {
  // after all tests we close socket so the test suite can actually terminate
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  // awaiting for Electrum to be connected. For RN Electrum would naturally connect
  // while app starts up, but for tests we need to wait for it
  await BlueElectrum.connectMain();
});

describe('LegacyWallet', function () {
  it('can serialize and unserialize correctly', () => {
    const a = new LegacyWallet();
    a.setLabel('my1');
    const key = JSON.stringify(a);

    const b = LegacyWallet.fromJson(key);
    assert.strictEqual(b.type, LegacyWallet.type);
    assert.strictEqual(key, JSON.stringify(b));
  });

  it('can fetch balance', async () => {
    const w = new LegacyWallet();
    w._address = NAME_HOLDER; // hack internals
    assert.ok(w.weOwnAddress(NAME_HOLDER));
    assert.ok(!w.weOwnAddress('aaa'));
    // @ts-ignore wrong type on purpose
    assert.ok(!w.weOwnAddress(false));
    assert.ok(w.getBalance() === 0);
    assert.ok(w.getUnconfirmedBalance() === 0);
    assert.ok(w._lastBalanceFetch === 0);

    await w.fetchBalance();

    // the amount was 9948820 when this was written and is whatever it is now; what has to hold is
    // that fetching found something and said when
    assert.ok(w.getBalance() > 0, `${NAME_HOLDER} was spent empty, pick another address`);
    assert.strictEqual(w.getUnconfirmedBalance(), 0);
    assert.ok(w._lastBalanceFetch > 0);
  });

  it('can fetch TXs and derive UTXO from them', async () => {
    const w = new LegacyWallet();
    w._address = NAME_HOLDER;
    await w.fetchTransactions();
    assert.ok(w.getTransactions().length > 0, `${NAME_HOLDER} has no history, pick another address`);

    for (const tx of w.getTransactions()) {
      assert.ok(tx.hash);
      assert.ok(tx.value);
      assert.ok(tx.timestamp);
      assert.ok(tx.confirmations! > 1);
    }

    assert.ok(w.weOwnTransaction('9e972369a17c468bfcebf67c3fe11b90222959023685ecfa73024bcb3677f2d7'));
    assert.ok(!w.weOwnTransaction('ffeadec08bbe7b21bf7cc50317b037f30db6923604e2ccf6a56a97e7efc07753'));

    for (const utxo of w.getUtxo(true)) {
      assert.strictEqual(utxo.address, NAME_HOLDER);
      assert.match(utxo.txid!, /^[0-9a-f]{64}$/);
      assert.ok(utxo.confirmations! > 0);
    }
  });

  it('keeps the names it holds out of its spendable coins', async () => {
    // This address holds seven names, which makes it the case a single-address wallet is worst at:
    // coin selection sees eight outputs and seven of them may only be spent by a name transaction,
    // so a payment that picks one is rejected by Doichain Core with "Non-name transaction has name
    // input" (Doichain/DoiWallet#37).
    const w = new LegacyWallet();
    w._address = NAME_HOLDER;
    await w.fetchTransactions();
    await w.fetchUtxo();

    const all = w.getUtxo(true);
    const spendable = w.getUtxo();
    assert.ok(all.length > spendable.length, `${NAME_HOLDER} no longer holds names, pick another address`);

    for (const utxo of all) {
      const held = w.isNameOutput(utxo.txid!, utxo.vout!);
      assert.strictEqual(
        spendable.some(s => s.txid === utxo.txid && s.vout === utxo.vout),
        !held,
        `${utxo.txid}:${utxo.vout} is ${held ? '' : 'not '}a name output and should ${held ? 'not ' : ''}be spendable`,
      );
    }
  });

  it.each([
    // Transaction with missing address output https://www.blockchain.com/btc/tx/d45818ae11a584357f7b74da26012d2becf4ef064db015a45bdfcd9cb438929d
    ['addresses for vout missing', 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e'],
    // ['txdatas were coming back null from BlueElectrum because of high batchsize', '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo'],
    // skipped because its slow and flaky if being run in pack with other electrum tests. uncomment and run single
    // if you need to debug huge electrum batches
  ])(
    'can fetch TXs when %s',
    async (useCase, address) => {
      const w = new LegacyWallet();
      w._address = address;
      await w.fetchTransactions();

      assert.ok(w.getTransactions().length > 0);
      for (const tx of w.getTransactions()) {
        assert.ok(tx.hash);
        assert.ok(tx.value);
        assert.ok(tx.timestamp);
        assert.ok(tx.confirmations! > 1);
      }
    },
    240000,
  );

  it('can fetch UTXO', async () => {
    const w = new LegacyWallet();
    w._address = 'N6dXumt8aJhkAZAnKNzUBNrBJJez2Efu7e';
    await w.fetchUtxo();
    assert.ok(w._utxo.length > 0, 'unexpected empty UTXO');
    assert.ok(w.getUtxo().length > 0, 'unexpected empty UTXO');

    assert.ok(w.getUtxo()[0].value);
    // assert.ok(w.getUtxo()[0].vout === 1, JSON.stringify(w.getUtxo()[0]));
    assert.ok(w.getUtxo()[0].txid);
    assert.ok(w.getUtxo()[0].confirmations);
    assert.ok(w.getUtxo()[0].txhex);
  });
});

describe('SegwitP2SHWallet', function () {
  it('can generate segwit P2SH address from WIF', async () => {
    const l = new SegwitP2SHWallet();
    l.setSecret('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG');
    assert.ok(l.getAddress() === '6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz', 'expected ' + l.getAddress());
    assert.ok(l.getAddress() === (await l.getAddressAsync()));
    assert.ok(l.weOwnAddress('6EWSDEnXSLHAeNwrtxnZpYWDicbzKjXdGz'));
    assert.ok(!l.weOwnAddress('garbage'));
    // @ts-ignore wrong type on purpose
    assert.ok(!l.weOwnAddress(false));
  });
});

describe('SegwitBech32Wallet', function () {
  it('can fetch balance', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'dc1qjw5x2d3mccfw6ajn2adm24yn7lhvh8xzer3d4p';
    assert.ok(w.weOwnAddress('dc1qjw5x2d3mccfw6ajn2adm24yn7lhvh8xzer3d4p'));
    assert.ok(w.weOwnAddress('dc1qjw5x2d3mccfw6ajn2adm24yn7lhvh8xzer3d4p'));
    assert.ok(!w.weOwnAddress('garbage'));
    // @ts-ignore wrong type on purpose
    assert.ok(!w.weOwnAddress(false));
    await w.fetchBalance();
    assert.strictEqual(w.getBalance(), 0);
  });

  it('can fetch UTXO', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'dc1qglq9r48zqalradfjlvdq9acy8wfn5227nlfjdk';
    await w.fetchUtxo();
    const l1 = w.getUtxo().length;
    assert.ok(w.getUtxo().length > 0, 'unexpected empty UTXO');

    assert.ok(w.getUtxo()[0].value);
    assert.ok(w.getUtxo()[0].vout === 0);
    assert.ok(w.getUtxo()[0].txid);
    assert.ok(w.getUtxo()[0].confirmations, JSON.stringify(w.getUtxo()[0], null, 2));
    // double fetch shouldnt duplicate UTXOs:
    await w.fetchUtxo();
    const l2 = w.getUtxo().length;
    assert.strictEqual(l1, l2);
  });

  it('can fetch TXs LegacyWallet', async () => {
    const w = new LegacyWallet();
    w._address = NAME_HOLDER;
    await w.fetchTransactions();
    const txs = w.getTransactions();
    assert.ok(txs.length > 0, `${NAME_HOLDER} has no history, pick another address`);

    // the amount shown next to a transaction is what we gained minus what we spent, in satoshi.
    // The two values this used to compare against, -51180 and 10000000, said nothing about whether
    // that sum is computed right; recomputing it from the transaction does.
    for (const tx of txs) {
      assert.strictEqual(tx.hash, tx.txid);
      assert.ok(tx.timestamp);
      assert.ok(tx.confirmations! > 1);

      let gained = 0;
      for (const output of tx.outputs) {
        if (output.scriptPubKey.addresses?.[0] === NAME_HOLDER) gained += Math.round(output.value * 100000000);
      }
      let spent = 0;
      for (const input of tx.inputs) {
        if (input.addresses?.[0] === NAME_HOLDER) spent += Math.round((input.value ?? 0) * 100000000);
      }

      assert.strictEqual(tx.value, gained - spent, `${tx.txid} does not add up`);
    }

    // newest first, which is the order the transaction list is drawn in
    for (let i = 1; i < txs.length; i++) {
      assert.ok(Number(txs[i - 1].timestamp) >= Number(txs[i].timestamp), 'transactions are not newest first');
    }
  });

  it('can fetch TXs SegwitBech32Wallet', async () => {
    const w = new SegwitBech32Wallet();
    w._address = 'dc1qatsxhjdd3tud62lpl57sjry0qyluvv9ff3sgkt';
    assert.ok(w.weOwnAddress('dc1qatsxhjdd3tud62lpl57sjry0qyluvv9ff3sgkt'));
    assert.ok(w.weOwnAddress('dc1qatsxhjdd3tud62lpl57sjry0qyluvv9ff3sgkt'));
    assert.ok(!w.weOwnAddress('garbage'));
    // @ts-ignore wrong type on purpose
    assert.ok(!w.weOwnAddress(false));
    await w.fetchTransactions();
    assert.strictEqual(w.getTransactions().length, 2);
    const tx = w.getTransactions()[1];
    assert.ok(tx.hash);
    assert.strictEqual(tx.value, 39976496);
    assert.ok(tx.timestamp);
    assert.ok(tx.confirmations! > 1);

    const tx0 = w.getTransactions()[0];
    assert.ok(tx0.inputs);
    assert.ok(tx0.inputs.length === 1);
    assert.ok(tx0.outputs);
    assert.ok(tx0.outputs.length === 2);

    assert.ok(w.weOwnTransaction('6bdda50ab68552cbfba946ed01c8819624ccd8ff57c7a39bf66fcf4bd8ce524b'));
    assert.ok(!w.weOwnTransaction('825c12f277d1f84911ac15ad1f41a3de28e9d906868a930b0a7bca61b17c8881'));
  });
});
