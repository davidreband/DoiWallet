import assert from 'assert';

import { HDLegacyBreadwalletWallet } from '../../class';

describe('HDLegacyBreadwalletWallet', () => {
  it('Legacy HD Breadwallet works', async () => {
    if (!process.env.HD_MNEMONIC_BREAD) {
      console.error('process.env.HD_MNEMONIC_BREAD not set, skipped');
      return;
    }
    const hdBread = new HDLegacyBreadwalletWallet();
    hdBread.setSecret(process.env.HD_MNEMONIC_BREAD);

    assert.strictEqual(hdBread.validateMnemonic(), true);
    assert.strictEqual(hdBread._getExternalAddressByIndex(0), 'NBuSLSfdJqeJ479ccT4fcg2CMZLmnXYT8L');
    assert.strictEqual(hdBread._getInternalAddressByIndex(0), 'N3Xr4U6PguMdvkLx2wi3vfsTz2JsCix8bH');
    hdBread._internal_segwit_index = 2;
    hdBread._external_segwit_index = 2;
    assert.ok(hdBread._getExternalAddressByIndex(0).startsWith('N'));
    assert.ok(hdBread._getInternalAddressByIndex(0).startsWith('N'));
    assert.strictEqual(hdBread._getExternalAddressByIndex(2), 'dc1qym3dkfstg7xhd5l02nztmdr7auee70aw0j7x9u');
    assert.strictEqual(hdBread._getInternalAddressByIndex(2), 'dc1qva9aq229k47k55vjpjsn94t7gs7l5tklcsurag');
    assert.strictEqual(hdBread._getDerivationPathByAddress('NBuSLSfdJqeJ479ccT4fcg2CMZLmnXYT8L'), "m/0'/0/0");
    assert.strictEqual(hdBread._getDerivationPathByAddress('dc1qym3dkfstg7xhd5l02nztmdr7auee70aw0j7x9u'), "m/0'/0/2");

    assert.strictEqual(
      hdBread._getPubkeyByAddress(hdBread._getExternalAddressByIndex(0)).toString('hex'),
      '02367900d613be4ea66856315f1cda6944ff824d301dd3604e7cebf592bc29ef61',
    );
    assert.strictEqual(
      hdBread._getPubkeyByAddress(hdBread._getInternalAddressByIndex(0)).toString('hex'),
      '03288a2a7125b7b5a9e34b1d73fdc01bbd871e3b3d287a671fd289b7918deb0dd6',
    );

    assert.strictEqual(
      hdBread.getXpub(),
      'xpub68iahKkKPy8X7xgYGfLuSFwxMAMQk96mBSoomvgvdCezzREWVbDtg8gZm4fRAkzLGxofEPUK5REqV6R7t31UfCoYGPR6L3gFqT9HnJACCvP',
    );

    assert.ok(hdBread.getAllExternalAddresses().includes('NBuSLSfdJqeJ479ccT4fcg2CMZLmnXYT8L'));
    assert.ok(hdBread.getAllExternalAddresses().includes('dc1qym3dkfstg7xhd5l02nztmdr7auee70aw0j7x9u'));
  });

  it('Can use french seed', async () => {
    const hdBread = new HDLegacyBreadwalletWallet();
    hdBread.setSecret('abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abaisser abeille');
    assert.strictEqual(hdBread.validateMnemonic(), true);
    assert.strictEqual(hdBread._getExternalAddressByIndex(0), 'NDq1Cb87NDMLbsu9z2eBp4daGCKEuJ3UD6');
  });
});
