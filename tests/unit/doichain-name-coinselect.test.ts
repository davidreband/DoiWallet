/**
 * Guard for Doichain/DoiWallet#37 - name outputs stay out of coin selection.
 */
import assert from 'assert';
import { nameops, address as libAddress } from '@doichain/doichainjs-lib';

import { DOICHAIN, MIN_NAME_AMOUNT_SAT } from '../../blue_modules/network.js';
import { HDSegwitBech32Wallet } from '../../class/wallets/hd-segwit-bech32-wallet';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('#37 - name outputs stay out of coin selection', () => {
  const nameTxid = 'a'.repeat(64);
  const coinTxid = 'b'.repeat(64);

  const buildWallet = () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(MNEMONIC);
    const holder = wallet._getExternalAddressByIndex(0);

    const nameScript = Buffer.from(nameops.nameDoiScript('somename', 'somevalue', libAddress.toOutputScript(holder, DOICHAIN))).toString('hex');

    // @ts-ignore standing in for fetchUtxo()
    wallet._utxo = [
      { txid: coinTxid, vout: 0, value: 500000, address: holder, wif: wallet._getWifForAddress(holder) },
      { txid: nameTxid, vout: 0, value: MIN_NAME_AMOUNT_SAT, address: holder, wif: wallet._getWifForAddress(holder) },
    ];
    wallet.getTransactions = () =>
      [
        {
          txid: nameTxid,
          confirmations: 3,
          inputs: [],
          outputs: [{ n: 0, value: 0.01, scriptPubKey: { hex: nameScript, addresses: [holder] } }],
        },
      ] as any;

    return wallet;
  };

  it('recognises a name output among our own outputs', () => {
    const wallet = buildWallet();
    assert.strictEqual(wallet.isNameOutput(nameTxid, 0), true);
    assert.strictEqual(wallet.isNameOutput(coinTxid, 0), false);
  });

  it('hides it from the list a payment selects from', () => {
    // Core rejects a payment that spends a name output with "Non-name transaction has name input"
    const spendable = buildWallet().getUtxo();
    assert.deepStrictEqual(
      spendable.map((u: any) => u.txid),
      [coinTxid],
    );
  });

  it('still shows it to a caller that asks for everything, such as coin control', () => {
    const all = buildWallet().getUtxo(true);
    assert.strictEqual(all.length, 2);
    assert.ok(all.some((u: any) => u.txid === nameTxid));
  });

  it('does not pay the name output away as fee when it transfers it', () => {
    // The name input is added after coin selection has run, because coin selection must not be
    // free to pick it. Its value was then assigned to no output at all and went to the miner: the
    // first real transfer on mainnet paid 1,018,055 satoshi, 1,000,000 of which is simply what the
    // name output carries in and the new name output carries straight back out.
    const wallet = buildWallet();
    const feeRate = 100;
    const recipient = wallet._getExternalAddressByIndex(1);

    // the 500000 the other tests use cannot even fund the name output; give it a whole coin, the
    // same as the transfer this was found on
    const coin = 100000000;
    // @ts-ignore standing in for fetchUtxo()
    wallet._utxo.find((u: any) => u.txid === coinTxid)!.value = coin;

    const { tx, fee } = wallet.createTransaction(
      wallet.getUtxo(),
      [{ address: recipient, value: MIN_NAME_AMOUNT_SAT }],
      feeRate,
      wallet._getInternalAddressByIndex(0),
      HDSegwitBech32Wallet.defaultRBFSequence,
      false,
      0,
      { nameId: 'somename', nameValue: 'somevalue', sendTo: recipient, nameOutpoint: { txid: nameTxid, vout: 0 } } as any,
    );
    assert.ok(tx, 'no transaction was built');

    const spent = coin + MIN_NAME_AMOUNT_SAT; // both inputs
    const received = tx!.outs.reduce((total: number, out: any) => total + Number(out.value), 0);
    const paidFee = spent - received;

    assert.strictEqual(paidFee, fee, `the transaction pays ${paidFee} while it reports ${fee}`);
    // what the chain charges for: every byte of the signed transaction, at the rate asked for
    const expected = tx!.virtualSize() * feeRate;
    assert.ok(paidFee >= expected, `${paidFee} is below the ${feeRate} sat/vByte the user asked for (${expected})`);
    assert.ok(paidFee < expected * 2, `${paidFee} is more than twice the ${expected} due`);
    assert.ok(paidFee < MIN_NAME_AMOUNT_SAT, `the name output's own ${MIN_NAME_AMOUNT_SAT} satoshi went into the fee`);
  });
});
