/**
 * Guard for Doichain/DoiWallet#38 - an imported name PSBT keeps its version.
 */
import assert from 'assert';

import { VERSION } from '../../blue_modules/network.js';

describe('#38 - an imported name PSBT keeps the version it arrived with', () => {
  const fixtures = require('./fixtures/doichain-name-purchases.json');

  const { Psbt } = require('@doichain/doichainjs-lib');

  it('a purchase from names-on-chain already carries version 0x7100', () => {
    // which is why handlePsbtSign() only has to check it, never set it
    for (const purchase of fixtures.purchases) {
      const psbt = Psbt.fromBase64(purchase.psbt, { network: fixtures.network });
      assert.strictEqual(psbt.version, VERSION, purchase.description);
    }
  });

  it('setting the version on one of them throws, which is what used to break signing', () => {
    // The seller receives it already signed by the buyer. From doichainjs-lib 6.2.0 on, setVersion()
    // refuses to touch a transaction that has signatures - so the old `psbt.setVersion(VERSION)` in
    // handlePsbtSign() made the seller unable to sign at all.
    for (const purchase of fixtures.purchases) {
      const psbt = Psbt.fromBase64(purchase.psbt, { network: fixtures.network });
      assert.throws(() => psbt.setVersion(VERSION), /signatures exist/, purchase.description);
    }
  });
});
