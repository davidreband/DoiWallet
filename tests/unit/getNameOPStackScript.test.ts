import assert from 'assert';
import { address, initEccLib } from '@doichain/doichainjs-lib';

import ecc from '../../blue_modules/noble_ecc';
import { DOICHAIN_REGTEST } from '../../blue_modules/network.js';
import { getNameOPStackScript, NAME_MAX_LENGTH, VALUE_MAX_LENGTH } from '../../utils/getNameOPStackScript';

// Taproot addresses cannot even be decoded without it, and the app wires it up in legacy-wallet.ts
initEccLib(ecc);

/**
 * The expected scripts are the `name_doi` entries of doichainjs-lib's test/fixtures/nameops.json.
 * Their transactions were accepted by a Doichain Core regtest node, so matching them byte for byte
 * is the check that matters (Doichain/DoiWallet#36).
 */
const P2PKH_HOLDER = 'msVUYawRj1AqUdJboCo86zjN1qijo9jm9v'; // 76a9148359edeb2dcbec1c9117500de7bfdbf5f14e421588ac
const P2WPKH_HOLDER = 'ncrt1qgfpyysjzgfpyysjzgfpyysjzgfpyysjzku429m'; // 00144242…42
const P2SH_HOLDER = '2MwuwnWHKuPv74ExQ17YvwboZ5yMGwqUamA';
const P2WSH_HOLDER = 'ncrt1qg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3zq2dakts';

describe('getNameOPStackScript', () => {
  it('matches the fixtures of doichainjs-lib byte for byte', () => {
    // an empty value still has to be a push, or Core reads no name at all
    assert.strictEqual(
      Buffer.from(getNameOPStackScript('hello', '', P2PKH_HOLDER, DOICHAIN_REGTEST)).toString('hex'),
      '5a0568656c6c6f006d7576a9148359edeb2dcbec1c9117500de7bfdbf5f14e421588ac',
    );

    assert.strictEqual(
      Buffer.from(getNameOPStackScript('hello', 'world', P2WPKH_HOLDER, DOICHAIN_REGTEST)).toString('hex'),
      '5a0568656c6c6f05776f726c646d7500144242424242424242424242424242424242424242',
    );

    // a value over 75 bytes is pushed with OP_PUSHDATA1
    assert.strictEqual(
      Buffer.from(getNameOPStackScript('hello', 'a'.repeat(80), P2WPKH_HOLDER, DOICHAIN_REGTEST)).toString('hex'),
      '5a0568656c6c6f4c50' + '61'.repeat(80) + '6d7500144242424242424242424242424242424242424242',
    );
  });

  it('refuses a holder nobody can spend from', () => {
    // Core accepts these outputs, and then the name and its locked DOI are gone for good
    const taproot = address.toBech32(Buffer.alloc(32, 0x22), 1, DOICHAIN_REGTEST.bech32);

    for (const holder of [P2SH_HOLDER, P2WSH_HOLDER, taproot]) {
      assert.throws(
        () => getNameOPStackScript('hello', 'world', holder, DOICHAIN_REGTEST),
        /can only be held by an address DoiWallet can spend from/,
        `${holder} should have been refused`,
      );
    }
  });

  it('refuses an address of another network', () => {
    assert.throws(
      () => getNameOPStackScript('hello', 'world', 'bc1qzyg3zyg3zyg3zyg3zyg3zyg3zyg3zyg3h8ffkz', DOICHAIN_REGTEST),
      /Invalid recipient address/,
    );
  });

  it('counts both limits in bytes, not characters', () => {
    // 200 × "ä" passes a character count of 255 but is 400 bytes, which Core rejects as invalid
    const longName = 'ä'.repeat(200);
    assert.strictEqual(longName.length, 200);
    assert.strictEqual(Buffer.byteLength(longName, 'utf8'), 400);
    assert.throws(() => getNameOPStackScript(longName, '', P2PKH_HOLDER, DOICHAIN_REGTEST), /nameId must be/);

    // a value over 520 bytes freezes the name: spending refuses any push longer than that
    const longValue = 'ä'.repeat(300);
    assert.strictEqual(longValue.length, 300);
    assert.strictEqual(Buffer.byteLength(longValue, 'utf8'), 600);
    assert.throws(() => getNameOPStackScript('hello', longValue, P2PKH_HOLDER, DOICHAIN_REGTEST), /nameValue must not be/);

    // the byte limits themselves still pass
    assert.ok(getNameOPStackScript('a'.repeat(NAME_MAX_LENGTH), 'b'.repeat(VALUE_MAX_LENGTH), P2PKH_HOLDER, DOICHAIN_REGTEST));
  });

  it('normalizes the name to NFC, so look-alike spellings are one name', () => {
    const nfc = 'café'; // é as one code point
    const nfd = 'café'; // e + combining acute

    assert.notStrictEqual(nfc, nfd);
    assert.strictEqual(
      Buffer.from(getNameOPStackScript(nfc, 'x', P2PKH_HOLDER, DOICHAIN_REGTEST)).toString('hex'),
      Buffer.from(getNameOPStackScript(nfd, 'x', P2PKH_HOLDER, DOICHAIN_REGTEST)).toString('hex'),
    );
  });

  it('rejects a missing name or value', () => {
    assert.throws(() => getNameOPStackScript('', 'x', P2PKH_HOLDER, DOICHAIN_REGTEST), /must be defined/);
    // @ts-expect-error the call site may hand us an undefined value
    assert.throws(() => getNameOPStackScript('hello', undefined, P2PKH_HOLDER, DOICHAIN_REGTEST), /must be defined/);
    assert.throws(() => getNameOPStackScript('ab', 'x', P2PKH_HOLDER, DOICHAIN_REGTEST), /at least 3 characters/);
  });
});
