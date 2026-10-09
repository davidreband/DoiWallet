/**
 * Guard for Doichain/DoiWallet#37 - name outputs stay out of coin selection.
 */
import assert from 'assert';
import { nameops, address as libAddress } from '@doichain/doichainjs-lib';

import { DOICHAIN, MIN_NAME_AMOUNT_SAT } from '../../blue_modules/network.js';
import { HDSegwitBech32Wallet } from '../../class';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('#37 - name outputs stay out of coin selection', () => {
  const nameTxid = 'a'.repeat(64);
  const coinTxid = 'b'.repeat(64);

  const buildWallet = () => {
    const wallet = new HDSegwitBech32Wallet();
    wallet.setSecret(MNEMONIC);
    const holder = wallet._getExternalAddressByIndex(0);

    const nameScript = nameops.nameDoiScript('somename', 'somevalue', libAddress.toOutputScript(holder, DOICHAIN)).toString('hex');

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
});
