/**
 * Guard for Doichain/DoiWallet#34 - the BIP32 private prefix on mainnet.
 */
import assert from 'assert';

import { DOICHAIN } from '../../blue_modules/network.js';
import { MultisigHDWallet } from '../../class';

describe('#34 - a standard extended private key is accepted on mainnet', () => {
  it('takes the BIP32 private prefix Doichain Core uses', () => {
    // Core uses 0x0488ade4, the same as Bitcoin and Namecoin. The wallet carried 0x0499ade4, and
    // every standard xprv was rejected because of it.
    assert.strictEqual(DOICHAIN.bip32.private, 0x0488ade4);
  });

  it('keeps a cosigner private key when importing an Electrum multisig file', () => {
    // importMultisigWalletFile() only keeps the xprv if isXprvValid() says yes, and silently falls
    // back to the xpub - watch-only - if it says no. With the wrong prefix it always said no.
    const zprv = 'ZprvAkUsoZMLiqxrhaM8VpmVJ6QhjH4dZnYpTNNHGMZ3VoE6vRv7xfDeMEiKAeH1eUcN3CFUP87CgM1anM2UytMkykUMtVmXkkohRsiVGth1VMG';
    assert.strictEqual(MultisigHDWallet.isXprvValid(zprv), true);

    // and nonsense is still nonsense
    assert.strictEqual(MultisigHDWallet.isXprvValid('Zprvlabla'), false);
    assert.strictEqual(MultisigHDWallet.isXprvValid(''), false);
  });
});
