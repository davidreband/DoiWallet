import assert from 'assert';

import { HDTaprootWallet } from '../../class/wallets/hd-taproot-wallet';
import { TaprootWallet } from '../../class/wallets/taproot-wallet';
import { uint8ArrayToHex } from '../../blue_modules/uint8array-extras';

/**
 * Upstream's vectors, re-encoded for Doichain: every bc1p…/1… address and K…/L… WIF below carries the
 * same key and script as BlueWallet's, under Doichain's prefixes, so the transaction hex is
 * unchanged. The class is kept so a stored wallet still loads; the app does not offer to create or
 * discover one, because taproot is never activated on Doichain mainnet.
 */
const utxos = [
  {
    height: 0,
    value: 181385,
    address: 'dc1p84mlccwgz7vz2y7xp0yy98zz5h8myyjd7zdncw6dzw9cm5yglu9qav89al',
    txid: 'e97f982766537c5330b50ef521bbcd8811971eb7cc9fd64bda45266136f27b82',
    vout: 0,
    wif: 'ThyxmJRT3SNVg6trKqMVr96uikL5vCLGHnDsUbPLgPLx1XNmPCZ4',
  },
];

describe('Taproot HD (BIP86)', () => {
  it('can create', async function () {
    const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
    const hd = new HDTaprootWallet();
    hd.setSecret(mnemonic);

    assert.strictEqual(true, hd.validateMnemonic());
    assert.strictEqual(hd.getMasterFingerprintHex(), '73C5DA0A');
    assert.strictEqual(
      'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ',
      hd.getXpub(),
    );

    assert.strictEqual(hd._getExternalAddressByIndex(0), 'dc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqsq29h5');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'dc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0wasrs8ypq');

    assert.strictEqual(hd._getInternalAddressByIndex(0), 'dc1p3qkhfews2uk44qtvauqyr2ttdsw7svhkl9nkm9s9c3x4ax5h60wqg6m3ef');

    assert.strictEqual(hd._getExternalWIFByIndex(0), 'Tfahp6zAPFkrqyuzxnSoPKxqBtwd1Re7XTvtcnfZA2jsjN3oFeDA');
    assert.ok(hd._getInternalWIFByIndex(0) !== hd._getInternalWIFByIndex(1));

    const w = new TaprootWallet();
    w.setSecret(hd._getExternalWIFByIndex(0) as string);

    assert.strictEqual(w.getAddress(), hd._getExternalAddressByIndex(0));

    assert.ok(hd.getAllExternalAddresses().includes('dc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqsq29h5'));

    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(0)), "m/86'/0'/0'/0/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getExternalAddressByIndex(1)), "m/86'/0'/0'/0/1");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(0)), "m/86'/0'/0'/1/0");
    assert.strictEqual(hd._getDerivationPathByAddress(hd._getInternalAddressByIndex(1)), "m/86'/0'/0'/1/1");

    assert.strictEqual(hd.getMasterFingerprintHex(), '73C5DA0A');

    let u8a = hd._getPubkeyByAddress(hd._getExternalAddressByIndex(0));
    assert(u8a);
    assert.strictEqual(uint8ArrayToHex(u8a), 'cc8a4bc64d897bddc5fbc2f670f7a8ba0b386779106cf1223c6fc5d7cd6fc115');
    u8a = hd._getPubkeyByAddress(hd._getInternalAddressByIndex(0));
    assert(u8a);
    assert.strictEqual(uint8ArrayToHex(u8a), '399f1b2f4393f29a18c937859c5dd8a77350103157eb880f02e8c08214277cef');
  });

  it('can generate addresses only via zpub', function () {
    const xpub = 'xpub6BgBgsespWvERF3LHQu6CnqdvfEvtMcQjYrcRzx53QJjSxarj2afYWcLteoGVky7D3UKDP9QyrLprQ3VCECoY49yfdDEHGCtMMj92pReUsQ';
    const hd = new HDTaprootWallet();
    hd._xpub = xpub;
    assert.strictEqual(hd._getExternalAddressByIndex(0), 'dc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqsq29h5');
    assert.strictEqual(hd._getExternalAddressByIndex(1), 'dc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0wasrs8ypq');
    assert.strictEqual(hd._getInternalAddressByIndex(0), 'dc1p3qkhfews2uk44qtvauqyr2ttdsw7svhkl9nkm9s9c3x4ax5h60wqg6m3ef');
    assert.ok(hd._getInternalAddressByIndex(0) !== hd._getInternalAddressByIndex(1));

    assert.ok(hd.getAllExternalAddresses().includes('dc1p5cyxnuxmeuwuvkwfem96lqzszd02n6xdcjrs20cac6yqjjwudpxqsq29h5'));
    assert.ok(hd.getAllExternalAddresses().includes('dc1p4qhjn9zdvkux4e44uhx8tc55attvtyu358kutcqkudyccelu0wasrs8ypq'));
    assert.ok(!hd.getAllExternalAddresses().includes('dc1p3qkhfews2uk44qtvauqyr2ttdsw7svhkl9nkm9s9c3x4ax5h60wqg6m3ef')); // not internal
  });

  it('can generate', async () => {
    const hd = new HDTaprootWallet();
    const hashmap: Record<string, boolean> = {};
    for (let c = 0; c < 1000; c++) {
      await hd.generate();
      const secret = hd.getSecret();
      assert.strictEqual(secret.split(' ').length, 12);
      if (hashmap[secret]) {
        throw new Error('Duplicate secret generated!');
      }
      hashmap[secret] = true;
      assert.ok(secret.split(' ').length === 12 || secret.split(' ').length === 24);
    }

    const hd2 = new HDTaprootWallet();
    hd2.setSecret(hd.getSecret());
    assert.ok(hd2.validateMnemonic());
  });

  it('can make xpub', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const hd = new HDTaprootWallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);

    assert.strictEqual(true, hd.validateMnemonic());
    assert.strictEqual(
      'xpub6D7Yb9GhEurKUHVVcpeaCRMBydwrJN3uoy2Mqt7UZXuVezdreniHwedHPGtzct3Fy7JgN6XqdJvw9svHvLHHDuh4RTDArPizwttxaHCzSCP',
      hd.getXpub(),
    );
  });

  it('can createTransaction with a correct feerate', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDTaprootWallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());

    const targetFeeRate = 1;
    const { tx, psbt, outputs } = hd.createTransaction(
      utxos,
      [{ address: 'MxrwPog3f3Cp4ypAE8HNqX87x2JwxpkEE4' }],
      targetFeeRate,
      hd._getInternalAddressByIndex(0),
    );

    assert.strictEqual(outputs.length, 1);
    assert(tx);

    const actualFeerate = Number(psbt.getFee()) / tx.virtualSize();
    assert.strictEqual(
      Math.round(actualFeerate) >= targetFeeRate && actualFeerate <= targetFeeRate + 1,
      true,
      `bad feerate, got ${actualFeerate}, expected at least ${targetFeeRate}; fee: ${psbt.getFee()}; virsualSize: ${tx.virtualSize()} vbytes; ${tx.toHex()}`,
    );

    // txid: 7a84a51cfd06db19037526ab60eb0f55fa6c9f4ff87bdfc5ec174e3375e38f0d
    assert.strictEqual(
      tx.toHex(),
      '02000000000101827bf236612645da4bd69fccb71e971188cdbb21f50eb530537c536627987fe90000000000000000800123c40200000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac0140bbf80293348710449dc44af7d9c31afb3935cce96687b29a0bab1e3dd344c1a604f5e7ee10586486940334c7b64bbbc034721275da3086822f2b1e987a79431500000000',
    );
  });

  it('can createTransaction with a correct feerate 2', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }
    const hd = new HDTaprootWallet();
    hd.setSecret(process.env.HD_MNEMONIC_BIP84);
    assert.ok(hd.validateMnemonic());

    const targetFeeRate = 10;
    const { tx, psbt, outputs } = hd.createTransaction(
      utxos,
      [
        { address: 'dc1pgrhjjw52p6a03v635f7cnl6ttvuz9f34ujhaefm6xqtscd3m473sy0cr9l', value: 10000 },
        { address: 'dc1pm6lqlel3qxefsx0v39nshtghasvvp6ghn3e5hd5q280j5m9h7csq909klt', value: 10000 },
        { address: 'dc1ptestlpef53v6vyku3f9rk0ve2mek2fdwnd9k6q3mnyn6vs9nqlsqx275f7', value: 10000 },
      ],
      targetFeeRate,
      hd._getInternalAddressByIndex(0),
    );

    assert.strictEqual(outputs.length, 4);
    assert(tx);

    const actualFeerate = Number(psbt.getFee()) / tx.virtualSize();
    assert.strictEqual(
      Math.round(actualFeerate) >= targetFeeRate && actualFeerate <= targetFeeRate + 1,
      true,
      `bad feerate, got ${actualFeerate}, expected at least ${targetFeeRate}; fee: ${psbt.getFee()}; virsualSize: ${tx.virtualSize()} vbytes; ${tx.toHex()}`,
    );
  });
});
