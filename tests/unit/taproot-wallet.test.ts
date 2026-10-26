import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';

import { DOICHAIN } from '../../blue_modules/network.js';
import { TaprootWallet } from '../../class';

/**
 * The same private key the upstream BlueWallet test used, re-encoded as a Doichain WIF, and the
 * taproot address it yields on Doichain. The address body is identical to upstream's bc1p… one -
 * same key, different prefix and checksum.
 *
 * This test used to assert the bitcoin WIF and a bc1p… address, which passed only because
 * TaprootWallet never passed the network: a Doichain WIF was rejected outright and a bitcoin one
 * produced a bitcoin address shown as if it were ours on Doichain.
 */
const WIF = 'TkY79tUnVeDjWzCr31s9iifnvGxofRNeicfomety5NgrNA92jacx';
const ADDRESS = 'dc1payhxedzyjtu8w7ven7au9925pmhc5gl59m77ht9vqq0l5xq8fsgqdh0pr7';
const RECIPIENT = 'NGQYU5ptSU571M3FEGQQVByPbkibZWoeqz';

describe('Taproot wallet', () => {
  it('can convert scriptPubKey to address', () => {
    let address = TaprootWallet.scriptPubKeyToAddress('512040ef293a8a0ebaf8b351a27d89ff4b5b3822a635e4afdca77a30170c363bafa3');
    assert.strictEqual(address, 'dc1pgrhjjw52p6a03v635f7cnl6ttvuz9f34ujhaefm6xqtscd3m473sy0cr9l');
    address = TaprootWallet.scriptPubKeyToAddress('');
    assert.strictEqual(address, false);
    address = TaprootWallet.scriptPubKeyToAddress('trololo');
    assert.strictEqual(address, false);
  });

  it('derives a Doichain address from a Doichain WIF', () => {
    const w = new TaprootWallet();
    w.setSecret(WIF);
    assert.strictEqual(w.getAddress(), ADDRESS);
    assert.ok(w.weOwnAddress(ADDRESS));
  });

  it('refuses a WIF of another network instead of deriving a foreign address', () => {
    const w = new TaprootWallet();
    w.setSecret('L4PKRVk1Peaar5WuH5LiKfkTygWtFfGrFeH2g2t3YVVqiwpJjMoF'); // a bitcoin WIF
    assert.strictEqual(w.getAddress(), false);
  });

  it('can create transaction', () => {
    const w = new TaprootWallet();
    w.setSecret(WIF);

    const utxos = [
      {
        height: 894578,
        value: 9778,
        address: ADDRESS,
        txid: '511e007f9c96b6d713a72b730506198f61dd96046edee72f0dc636bfe1f3a9cf',
        vout: 0,
        confirmations: 1046,
      },
    ];

    // sendMax
    const txNew = w.createTransaction(utxos, [{ address: RECIPIENT }], 1, String(w.getAddress()), 0xffffffff, false, 0);
    assert.ok(txNew.tx);

    const tx = bitcoin.Transaction.fromHex(txNew.tx!.toHex());
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    // the recipient has to come back out as a Doichain address, not a bitcoin one
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[0].script, DOICHAIN), RECIPIENT);
    // a key-path taproot spend carries a single 64-byte signature and no scriptSig
    assert.strictEqual(tx.ins[0].witness.length, 1);
    assert.strictEqual(tx.ins[0].witness[0].length, 64);
    assert.strictEqual(tx.ins[0].script.length, 0);
    // sendMax leaves no change, so the fee is whatever the input did not pay out
    assert.strictEqual(9778 - Number(tx.outs[0].value), txNew.fee);
  });
});
