/**
 * Name operations, checked against a real Doichain Core regtest node.
 *
 * These scenarios exist because nothing else can answer the question that matters: whether Core
 * accepts the transaction the wallet built. A name sent to an address the wallet cannot spend from
 * is accepted by Core and then lost together with the DOI locked in it, which is how
 * Doichain/DoiWallet#36 went unnoticed. The same goes for the rules around a name input
 * (Doichain/DoiWallet#35, #37): getting them wrong produces a transaction that simply gets
 * rejected, with a reject reason no unit test would have predicted.
 *
 * Start the node first:  ./scripts/regtest-node.sh start
 * Then run:              npm run regtest
 * Without a node the whole suite skips rather than fails.
 */
import assert from 'assert';

import { HDSegwitBech32Wallet } from '../../class';
import { CreateTransactionUtxo } from '../../class/wallets/types';
import { MIN_NAME_AMOUNT, broadcast, cli, fundAddress, isNodeUp, nameOutputOf, nameShow, testAccept, uniqueName } from './rpc';

// The wallet classes read their network parameters from this module, so pointing DOICHAIN at the
// regtest parameters is what makes a real wallet produce ncrt1… addresses the node accepts. The call
// is hoisted above the imports above, which is why it still takes effect.
//
// The BIP32 serialization prefixes stay the mainnet ones on purpose: `_zpubToXpub()` rewrites a zpub
// with a hardcoded 0488b21e (upstream BlueWallet code, and correct on mainnet, where DOICHAIN uses
// that very prefix), so a regtest prefix here would only make bip32.fromBase58() reject our own
// xpub. The prefix affects how an extended key is written down, not the keys or addresses derived
// from it, so everything under test is unaffected.
jest.mock('../../blue_modules/network.js', () => {
  const actual = jest.requireActual('../../blue_modules/network.js');
  return { ...actual, DOICHAIN: { ...actual.DOICHAIN_REGTEST, bip32: actual.DOICHAIN_MAINNET.bip32 } };
});

const FEE_RATE = 100; // sat/vByte, the chain's floor - see MIN_RELAY_FEE_SAT_PER_VBYTE

const describeIfNode = isNodeUp() ? describe : describe.skip;

describeIfNode('name operations against Doichain Core regtest', () => {
  let wallet: HDSegwitBech32Wallet;
  let ourAddress: string;
  let changeAddress: string;

  beforeAll(() => {
    wallet = new HDSegwitBech32Wallet();
    wallet.setSecret('abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about');
    ourAddress = wallet._getExternalAddressByIndex(0);
    changeAddress = wallet._getInternalAddressByIndex(0);
  });

  it('derives regtest addresses, so the node and the wallet agree on the network', () => {
    assert.ok(ourAddress.startsWith('ncrt1q'), `expected an ncrt1q address, got ${ourAddress}`);
  });

  /** Makes the wallet see the outputs we hand it, the way fetchUtxo() normally would. */
  const giveWalletUtxos = (utxos: CreateTransactionUtxo[]) => {
    // @ts-ignore reaching into the wallet is the point: we stand in for fetchUtxo()
    wallet._utxo = utxos;
  };

  /**
   * Makes the wallet see a transaction, so isNameOutput() can tell a name output from a coin the
   * same way it does in the app - off the stored transactions.
   */
  const giveWalletTransactions = (txs: any[]) => {
    wallet.getTransactions = () => txs as any;
  };

  it('registers a name held by one of its own P2WPKH addresses', () => {
    const name = uniqueName('reg');
    const coin = fundAddress(ourAddress, 1);

    const utxo: CreateTransactionUtxo[] = [
      { txid: coin.txid, vout: coin.vout, value: coin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    giveWalletUtxos(utxo);
    giveWalletTransactions([]);

    const { tx } = wallet.createTransaction(
      utxo,
      [{ address: ourAddress, value: MIN_NAME_AMOUNT }],
      FEE_RATE,
      changeAddress,
      HDSegwitBech32Wallet.finalRBFSequence,
      false,
      0,
      // no outpoint: a first registration has no previous name output to spend
      { nameId: name, nameValue: 'hello', sendTo: ourAddress },
    );

    const verdict = testAccept(tx!.toHex());
    assert.strictEqual(verdict.allowed, true, `Core rejected the registration: ${verdict.reason}`);

    broadcast(tx!.toHex());
    assert.strictEqual(nameShow(name).address, ourAddress);
  });

  it('transfers a name, spending its previous output as the name input', () => {
    const name = uniqueName('mov');

    // --- register it first, so there is a name output to transfer
    const coin = fundAddress(ourAddress, 1);
    const utxo: CreateTransactionUtxo[] = [
      { txid: coin.txid, vout: coin.vout, value: coin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    giveWalletUtxos(utxo);
    giveWalletTransactions([]);

    const registration = wallet.createTransaction(
      utxo,
      [{ address: ourAddress, value: MIN_NAME_AMOUNT }],
      FEE_RATE,
      changeAddress,
      HDSegwitBech32Wallet.finalRBFSequence,
      false,
      0,
      { nameId: name, nameValue: 'first', sendTo: ourAddress },
    );
    const regTxid = broadcast(registration.tx!.toHex());
    const nameOut = nameOutputOf(regTxid);

    // --- now the transfer. The name output is deliberately NOT in the list we hand to
    // createTransaction: coin selection must not see it (#37), and the wallet has to find it on its
    // own through getUtxo(true).
    const feeCoin = fundAddress(ourAddress, 1);
    const spendable: CreateTransactionUtxo[] = [
      { txid: feeCoin.txid, vout: feeCoin.vout, value: feeCoin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    const nameUtxo: CreateTransactionUtxo = {
      txid: nameOut.txid,
      vout: nameOut.vout,
      value: nameOut.value,
      address: ourAddress,
      wif: wallet._getWifForAddress(ourAddress),
    };
    giveWalletUtxos([...spendable, nameUtxo]);
    giveWalletTransactions([
      {
        txid: nameOut.txid,
        confirmations: 1,
        inputs: [],
        outputs: [{ n: nameOut.vout, value: nameOut.value / 1e8, scriptPubKey: { hex: nameOut.script, addresses: [ourAddress] } }],
      },
    ]);

    const recipient = wallet._getExternalAddressByIndex(1);
    const { tx } = wallet.createTransaction(
      spendable,
      [{ address: recipient, value: MIN_NAME_AMOUNT }],
      FEE_RATE,
      changeAddress,
      HDSegwitBech32Wallet.finalRBFSequence,
      false,
      0,
      { nameId: name, nameValue: 'moved', sendTo: recipient, nameOutpoint: { txid: nameOut.txid, vout: nameOut.vout } },
    );

    const verdict = testAccept(tx!.toHex());
    assert.strictEqual(verdict.allowed, true, `Core rejected the transfer: ${verdict.reason}`);

    broadcast(tx!.toHex());
    const shown = nameShow(name);
    assert.strictEqual(shown.address, recipient, 'the name did not move to the recipient');
    assert.strictEqual(shown.value, 'moved');
  });

  it('moves the name the outpoint names, not whichever one sits at that address', () => {
    // A wallet reuses its addresses, so one address ends up holding several names at once - the
    // regtest runs put seven on a single address. Picking the input by holder address could not say
    // which one, and would move an arbitrary name (Doichain/DoiWallet#35).
    const first = uniqueName('two');
    const second = uniqueName('two');
    const registered: Record<string, ReturnType<typeof nameOutputOf>> = {};

    for (const name of [first, second]) {
      const coin = fundAddress(ourAddress, 1);
      const utxo: CreateTransactionUtxo[] = [
        { txid: coin.txid, vout: coin.vout, value: coin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
      ];
      giveWalletUtxos(utxo);
      giveWalletTransactions([]);
      const reg = wallet.createTransaction(
        utxo,
        [{ address: ourAddress, value: MIN_NAME_AMOUNT }],
        FEE_RATE,
        changeAddress,
        HDSegwitBech32Wallet.finalRBFSequence,
        false,
        0,
        { nameId: name, nameValue: name, sendTo: ourAddress },
      );
      registered[name] = nameOutputOf(broadcast(reg.tx!.toHex()));
    }

    // both are held by the very same address
    assert.strictEqual(nameShow(first).address, ourAddress);
    assert.strictEqual(nameShow(second).address, ourAddress);

    // hand the wallet both name outputs, so only the outpoint can tell them apart
    const feeCoin = fundAddress(ourAddress, 1);
    const spendable: CreateTransactionUtxo[] = [
      { txid: feeCoin.txid, vout: feeCoin.vout, value: feeCoin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    giveWalletUtxos([
      ...spendable,
      ...[first, second].map(n => ({
        txid: registered[n].txid,
        vout: registered[n].vout,
        value: registered[n].value,
        address: ourAddress,
        wif: wallet._getWifForAddress(ourAddress),
      })),
    ]);
    giveWalletTransactions(
      [first, second].map(n => ({
        txid: registered[n].txid,
        confirmations: 1,
        inputs: [],
        outputs: [
          {
            n: registered[n].vout,
            value: registered[n].value / 1e8,
            scriptPubKey: { hex: registered[n].script, addresses: [ourAddress] },
          },
        ],
      })),
    );

    const recipient = wallet._getExternalAddressByIndex(1);
    const { tx } = wallet.createTransaction(
      spendable,
      [{ address: recipient, value: MIN_NAME_AMOUNT }],
      FEE_RATE,
      changeAddress,
      HDSegwitBech32Wallet.finalRBFSequence,
      false,
      0,
      { nameId: second, nameValue: 'moved', sendTo: recipient, nameOutpoint: registered[second] },
    );

    const verdict = testAccept(tx!.toHex());
    assert.strictEqual(verdict.allowed, true, `Core rejected the transfer: ${verdict.reason}`);
    broadcast(tx!.toHex());

    assert.strictEqual(nameShow(second).address, recipient, 'the named one did not move');
    assert.strictEqual(nameShow(second).value, 'moved');
    assert.strictEqual(nameShow(first).address, ourAddress, 'the other name must not have been touched');
    assert.strictEqual(nameShow(first).value, first);
  });

  it('refuses to build a name output under MinNameCoinAmount instead of letting Core reject it', () => {
    const name = uniqueName('low');
    const coin = fundAddress(ourAddress, 1);
    const utxo: CreateTransactionUtxo[] = [
      { txid: coin.txid, vout: coin.vout, value: coin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    giveWalletUtxos(utxo);
    giveWalletTransactions([]);

    assert.throws(
      () =>
        wallet.createTransaction(
          utxo,
          [{ address: ourAddress, value: MIN_NAME_AMOUNT - 1 }],
          FEE_RATE,
          changeAddress,
          HDSegwitBech32Wallet.finalRBFSequence,
          false,
          0,
          { nameId: name, nameValue: 'x', sendTo: ourAddress },
        ),
      /must hold at least/,
    );
  });

  it('refuses a holder nobody can spend from, so the name cannot be lost', () => {
    const name = uniqueName('p2sh');
    const coin = fundAddress(ourAddress, 1);
    const utxo: CreateTransactionUtxo[] = [
      { txid: coin.txid, vout: coin.vout, value: coin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    giveWalletUtxos(utxo);
    giveWalletTransactions([]);

    // a P2SH address of the node's own wallet - exactly what a multisig or hardware wallet hands out
    const p2sh = cli<string>('getnewaddress', '', 'p2sh-segwit');

    assert.throws(
      () =>
        wallet.createTransaction(
          utxo,
          [{ address: ourAddress, value: MIN_NAME_AMOUNT }],
          FEE_RATE,
          changeAddress,
          HDSegwitBech32Wallet.finalRBFSequence,
          false,
          0,
          { nameId: name, nameValue: 'x', sendTo: p2sh },
        ),
      /can only be held by an address DoiWallet can spend from/,
    );
  });

  it('says so when the outpoint it has to spend is not ours', () => {
    const coin = fundAddress(ourAddress, 1);
    const utxo: CreateTransactionUtxo[] = [
      { txid: coin.txid, vout: coin.vout, value: coin.value, address: ourAddress, wif: wallet._getWifForAddress(ourAddress) },
    ];
    giveWalletUtxos(utxo); // only a plain coin, no name output
    giveWalletTransactions([]);

    assert.throws(
      () =>
        wallet.createTransaction(
          utxo,
          [{ address: ourAddress, value: MIN_NAME_AMOUNT }],
          FEE_RATE,
          changeAddress,
          HDSegwitBech32Wallet.finalRBFSequence,
          false,
          0,
          { nameId: 'whatever', nameValue: 'x', sendTo: ourAddress, nameOutpoint: { txid: 'f'.repeat(64), vout: 0 } },
        ),
      /does not hold the name output/,
    );
  });
});
