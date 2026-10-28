import assert from 'assert';

import { HDLegacyElectrumSeedP2PKHWallet } from '../../class/wallets/hd-legacy-electrum-seed-p2pkh-wallet';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

describe('HDLegacyElectrumSeedP2PKHWallet', () => {
  it('wont accept BIP39 seed', () => {
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret(
      'honey risk juice trip orient galaxy win situate shoot anchor bounce remind horse traffic exotic since escape mimic ramp skin judge owner topple erode',
    );
    assert.ok(!hd.validateMnemonic());
  });

  it('wont accept electrum seed, but SEGWIT seed', () => {
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret('method goddess  humble  crumble output snake essay carpet monster barely trip betray ');
    assert.ok(!hd.validateMnemonic());
  });

  it('can import mnemonics and generate addresses and WIFs', async function () {
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret('receive happy  wash prosper update    pet neck acid try profit proud hungry  ');
    assert.ok(hd.validateMnemonic());
    assert.strictEqual(
      hd.getXpub(),
      'xpub661MyMwAqRbcG6vx5SspHUzrhRtPKyeGp41JJLBi3kgeMCFkR6mzGkhEttBHTZg6FYYij52pqD2cW7XsutiZrRukXNLqeo87mZAV5k5bC22',
    );

    let address = hd._getExternalAddressByIndex(0);
    assert.strictEqual(address, 'MvmwMCzrceitFFbjdBmqE7hkKx4bJZZVMc');
    assert.ok(hd.getAllExternalAddresses().includes('MvmwMCzrceitFFbjdBmqE7hkKx4bJZZVMc'));

    address = hd._getInternalAddressByIndex(0);
    assert.strictEqual(address, 'NEZ3NZxPMXo8h5vvwCmCWCvSMHH2jQoUHu');

    let wif = hd._getExternalWIFByIndex(0);
    assert.strictEqual(wif, 'TeRBiYNkpafFV1HGnrvqKEJc7wc483bdhdHT9a6Sgwckf7H4uFSs');

    wif = hd._getInternalWIFByIndex(0);
    assert.strictEqual(wif, 'TmBQkV9YeG9HHnyjmkHnUiUyEx8WDYYYhUb3vQFaHG7m8hCgSdcc');

    let u8a = hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0));
    assert(u8a);
    assert.strictEqual(uint8ArrayToHex(u8a), '02a6e6b674f82796cb4776673d824bf0673364fab24e62dcbfff4c1a5b69e3519b');
    u8a = hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0));
    assert(u8a);
    assert.strictEqual(uint8ArrayToHex(u8a), '0344708260d2a832fd430285a0b915859d73e6ed4c6c6a9cb73e9069a9de56fb23');

    hd.setSecret('bs');
    assert.ok(!hd.validateMnemonic());
  });

  it('can use mnemonic with passphrase', () => {
    const mnemonic = 'receive happy  wash prosper update    pet neck acid try profit proud hungry  ';
    const passphrase = 'super secret passphrase';
    const hd = new HDLegacyElectrumSeedP2PKHWallet();
    hd.setSecret(mnemonic);
    hd.setPassphrase(passphrase);

    assert.strictEqual(
      hd.getXpub(),
      'xpub661MyMwAqRbcGSUBZaVtq8qEoRkJM1TZNNvUJEgQvtiZE73gS1wKWQoTj6R2E46UDYS2SBpmGGrSHGsJUNxtr1krixFuq8JA772pG43Mo6R',
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'MySm8XMfLkE6F8osZht6bMe82dBRajT5Qw');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'N2Nc7caG32qL7N67HzCtP4omMu9GiNdT3g');
    assert.strictEqual(hd._getExternalWIFByIndex(0), 'TfJJBcDEZZ7TzT8KzAdLyjxJ2TkVXv5tU5WXJe4tDxoqfD4PiMaV');
  });
});
