/* global it, describe */
import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';
import { DOICHAIN } from '../../blue_modules/network.js';

//import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDSegwitP2SHWallet, WatchOnlyWallet } from '../../class';
import { HDLegacyP2PKHWallet, HDSegwitBech32Wallet, HDSegwitP2SHWallet} from '../../class';

describe('AbstractHDElectrumWallet.cosign', () => {


  it.skip('different descendants of AbstractHDElectrumWallet can cosign one transaction', async () => {
    
    if (!process.env.HD_MNEMONIC || !process.env.HD_MNEMONIC_BIP49) {
      console.error('process.env.HD_MNEMONIC or HD_MNEMONIC_BIP49 not set, skipped');
      return;
    }

    const w1 = new HDLegacyP2PKHWallet();
    w1.setSecret(process.env.HD_MNEMONIC);
    assert.ok(w1.validateMnemonic()); 
    const w1Utxo = [
      {
        height: 349566,
        value: 8323200,
        address: "N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP",
        vout: 0,
        txid: "95e43c0040fe3fdd679e0fc95be1f8a8babe3f2b902ebabfea1381bf52cd1b54",
        amount: 8323200,
        confirmations: 1,
        txhex:
          "0200000001ef6f84cebcd950e65fbd6b50d779be2858ac25288781cc436a52934acf003226010000006a47304402204f80244fb0c261dbb2f345d7c5f7a1949786bbadb822768cedf6e4f19bc2947e02204accd7381d927470adcf04231def150f5b009031995cfcbde4044d98e0b46de10121032a029a507302347d599d44b47a7d9698a7256471f5ec8f4c74aa336b3005d8fefdffffff0280007f00000000001976a9142fa11256aaa10f62176794887c0aae99490c243088ac8096980000000000160014d7c61c3f9cc28e36e1fbc8f884177af9f27913d8f0550500",
      },
    ];

    const w2 = new HDSegwitBech32Wallet();
    w2.setSecret(process.env.HD_MNEMONIC);
    assert.ok(w2.validateMnemonic());      
    const w2Utxo = [
      {
        height: 198350,
        value: 10000000,
        address: "dc1qvtztrf6zpxffxgfeewd9aq2ytzuny5yjepecen",
        vout: 1,
        txid: "615174140e35fa06044c75165ca41c8bbeffb81185845e3df1d9c51d9b7580cd",
        amount: 10000000,
        confirmations: 1,
      },
    ];

    const w3 = new HDSegwitP2SHWallet();
    w3.setSecret(process.env.HD_MNEMONIC_BIP49);   
    assert.ok(w3.validateMnemonic());
    const w3Utxo = [
      {
        height: 591862,
        value: 26000,
        address: '6VZxBkWzXYdhzX2Brq3hnQ6f8KYRDYNa4y',
        txid: 'fe9c4d1b240f270e9cda227c48e29b2983cb26aaab183b34454871d5d9acc987',
        vout: 0,
        amount: 26000,
        confirmations: 1,
      },
    ];

    // now let's create transaction with 3 different inputs for each wallet and one output
    // maybe in future bitcoin-js will support psbt.join() and this test can be simplified to:
    //  const { psbt } = w1.createTransaction(w1Utxo, [{address: w1._getExternalAddressByIndex(0)}], 1, w1._getInternalAddressByIndex(0), undefined, true)
    //  const { psbt:psbt2 } = w2.createTransaction(w2Utxo, [{address: w2._getExternalAddressByIndex(0)}], 1, w2._getInternalAddressByIndex(0), undefined, true)
    //  const { psbt:psbt3 } = w3.createTransaction(w3Utxo, [{address: w3._getExternalAddressByIndex(0)}], 1, w3._getInternalAddressByIndex(0), undefined, true)
    //  psbt.join(psbt2, psbt3)
    // but for now, we will construct psbt by hand

    const sequence = HDSegwitBech32Wallet.defaultRBFSequence;
    const masterFingerprintBuffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
    const psbt = new bitcoin.Psbt();

    // add one input from each wallet
    {
      // w1
      const input = w1Utxo[0];
      const pubkey = w1._getPubkeyByAddress(input.address);
      const path = w1._getDerivationPathByAddress(input.address);

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
       /*
        bip32Derivation: [
          {
            masterFingerprint: masterFingerprintBuffer,
            path,
            pubkey,
          },
        ],
        */
        // non-segwit inputs now require passing the whole previous tx as Buffer
        nonWitnessUtxo: Buffer.from(input.txhex, 'hex'),
      });
    }

    {
      // w2
      const input = w2Utxo[0];      
      const pubkey = w2._getPubkeyByAddress(input.address);      
      const path = w2._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({
        pubkey: pubkey,
        network: DOICHAIN,
      });

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        /*
        bip32Derivation: [
          {
            masterFingerprint: masterFingerprintBuffer,
            path,
            pubkey,
          },
        ],
        */
        witnessUtxo: {
          script: p2wpkh.output,
          value: input.value,
        },
      });
    }
/*
    {
      // w3
      const input = w3Utxo[0];
      console.log("______input", input)
      const pubkey = w3._getPubkeyByAddress(input.address);
      console.log("______pubkey", pubkey)
      const path = w3._getDerivationPathByAddress(input.address);
      const p2wpkh = bitcoin.payments.p2wpkh({ 
        pubkey: pubkey,
        network: DOICHAIN, 
      });
      const p2sh = bitcoin.payments.p2sh({ redeem: p2wpkh });

      psbt.addInput({
        hash: input.txid,
        index: input.vout,
        sequence,
        bip32Derivation: [
          {
            masterFingerprint: masterFingerprintBuffer,
            path,
            pubkey,
          },
        ],
        witnessUtxo: {
          script: p2sh.output,
          value: input.value,
        },
        redeemScript: p2wpkh.output,
      });
    }
*/
    // send all to the one output

    console.log("____w1._getExternalAddressByIndex(0)", w1._getExternalAddressByIndex(0))
    psbt.addOutput({
      address: w1._getExternalAddressByIndex(0),
      value: 10000,
    });

    assert.strictEqual(
      psbt.toBase64(),
      'cHNidP8BAKcCAAAAA1+8dBEMLW/PTRFhpZkT+80rarPFqetNDcCFlRXLyGVPAAAAAAAAAACAbZP7eSKA4mMEs3Cr69I3Qwzt21Zwh38dKpjYCSSpAK0BAAAAAAAAAICHyazZ1XFIRTQ7GKuqJsuDKZviSHwi2pwOJw8kG02c/gAAAAAAAAAAgAEQJwAAAAAAABl2qRRNxsv2TfmrEGzugSx1AZYLk+khd4isAAAAAAABAP1gAQEAAAAAAQHo2Y7/u0+6TwqJvPIX61p+L478rkTzLsrLxdjMPOaDwwEAAAAXFgAUi6bQLnTApuAA6LF06y7UTl6iEab/////BRAnAAAAAAAAGXapFE3Gy/ZN+asQbO6BLHUBlguT6SF3iKwgTgAAAAAAABl2qRS8Lba3TI25sYhxHc7dUR5qMFYD9YisMHUAAAAAAAAZdqkUTcbL9k35qxBs7oEsdQGWC5PpIXeIrECcAAAAAAAAGXapFLwttrdMjbmxiHEdzt1RHmowVgP1iKwgRxYAAAAAABepFOKG1Y5T+SR6RxDlEjLM4GhvFoc8hwJIMEUCIQCvOADNgXHxVHhc8T9GwJL2HBZo+X20MrtOfte8gSqMbQIgUb3coerxrYtfO9DM3nRH5W/TyHCeWQbwLsYybppbL/MBIQOaQh1et8neZZCuKkcctVa2DejGsFa+uQfb3B9eYJL1iAAAAAAiBgMW6EolVvMKGZVBYz9d2meHcQzKsmdxtwhPTJ4RBPR2ZxgAAAAALAAAgAAAAIAAAACAAAAAAAAAAAAAAQEfUMMAAAAAAAAWABRdVlN9SNyYZGw0RlmtnzqBcHoXxSIGAnqv8b0nSBLQEkZL4l3AZYcoektXhnjljJSaEzufuTx/GAAAAABUAACAAAAAgAAAAIAAAAAAAQAAAAABASCQZQAAAAAAABepFHH8oGeDfo3SSYkgJqW15AVPiyXhhwEEFgAUojm2oMvHqtwud2Q942MGphZ/rRUiBgICrDvRWeVNwx5lhCrV+aELTrAk6DhkoxmyfeZe4IsqORgAAAAAMQAAgAAAAIAAAACAAAAAAAAAAAAAAA==',
    );

    // now signing this psbt usign wallets one by one
    // because BW users will pass psbt from one device to another base64 encoded, let's do the same

    let tx;

    assert.strictEqual(w1.calculateHowManySignaturesWeHaveFromPsbt(psbt), 0);
    tx = w1.cosignPsbt(psbt).tx;
    assert.strictEqual(w1.calculateHowManySignaturesWeHaveFromPsbt(psbt), 1);
    assert.strictEqual(tx, false); // not yet fully-signed

    tx = w2.cosignPsbt(psbt).tx;
    assert.strictEqual(w2.calculateHowManySignaturesWeHaveFromPsbt(psbt), 2);
    assert.strictEqual(tx, false); // not yet fully-signed

    tx = w3.cosignPsbt(psbt).tx; // GREAT SUCCESS!
    assert.strictEqual(w3.calculateHowManySignaturesWeHaveFromPsbt(psbt), 3);
    assert.ok(tx);

    assert.strictEqual(
      tx.toHex(),
      '020000000001035fbc74110c2d6fcf4d1161a59913fbcd2b6ab3c5a9eb4d0dc0859515cbc8654f000000006a473044022041df555e5f6a3769fafdbe23bfe29de84a1341b8fd85ffd279e238309c5df07702207cf1628b35ccacdb7d34e20fd46a3bc8adc0b1bd3b63249a3a4442b5a993d73501210316e84a2556f30a199541633f5dda6787710ccab26771b7084f4c9e1104f47667000000806d93fb792280e26304b370abebd237430ceddb5670877f1d2a98d80924a900ad01000000000000008087c9acd9d5714845343b18abaa26cb83299be2487c22da9c0e270f241b4d9cfe0000000017160014a239b6a0cbc7aadc2e77643de36306a6167fad15000000800110270000000000001976a9144dc6cbf64df9ab106cee812c7501960b93e9217788ac0002483045022100efe66403aba1441041dfdeff1f24b5e89ab5728ae7ceb9edb264eee004d5883c02207bf03cb611c9322086ac75fa97c374e9540c911359ede4f62de3c94c429ea2320121027aaff1bd274812d012464be25dc06587287a4b578678e58c949a133b9fb93c7f0247304402207a99c115f0b372d151caf991bb5af9f880e7d87625eeb4233fefa671489ed8e702200e5675b92e4e22b2fe37f563b2a0e75fb81def5a6efb431c7ca3b654ef63fe5801210202ac3bd159e54dc31e65842ad5f9a10b4eb024e83864a319b27de65ee08b2a3900000000',
    );
  });
/*
  it('HDSegwitBech32Wallet can cosign psbt with correct fingerprint', async () => {
    if (!process.env.MNEMONICS_COBO) {
      console.error('process.env.HD_MNEMONIC or HD_MNEMONIC_BIP49 not set, skipped');
      return;
    }

    const w = new HDSegwitBech32Wallet();
    w.setSecret(process.env.MNEMONICS_COBO);
    assert.ok(w.validateMnemonic());

    const psbtWithCorrectFpBase64 =
      'cHNidP8BAFUCAAAAAfsmeQ1mJJqC9cD0DxDRFQoG2hvU6S4koB0jl+8TEDKjAAAAAAD/////AQpfAAAAAAAAGXapFBkSnVPmMZuvGdugWb6tFm35Crj1iKwAAAAAAAEBH8p3AAAAAAAAFgAUf8fcrCg92McSzWkmw+UAluC4IjsiBgLfsmddhS3oxlnlGrUPDBVoVHSMa8RcXlGsyhfc8CcGpRjTfq2IVAAAgAAAAIAAAACAAAAAAAQAAAAAAA==';
    const psbtWithCorrectFp = bitcoin.Psbt.fromBase64(psbtWithCorrectFpBase64);

    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbtWithCorrectFp), 0);

    const { tx } = w.cosignPsbt(psbtWithCorrectFp);
    assert.ok(tx && tx.toHex());
    assert.strictEqual(w.calculateHowManySignaturesWeHaveFromPsbt(psbtWithCorrectFp), 1);
  });

  it('can cosign with non-zero account', async () => {
    if (!process.env.HD_MNEMONIC_BIP84) {
      console.error('process.env.HD_MNEMONIC_BIP84 not set, skipped');
      return;
    }

    const signerWallet = new HDSegwitBech32Wallet();
    signerWallet.setSecret(process.env.HD_MNEMONIC_BIP84);
    signerWallet.setDerivationPath("m/84'/0'/1'"); // account 1

    // setting up watch-only wallet that tracks signer wallet, with the same fp & path:
    const watchOnlyWallet = new WatchOnlyWallet();
    watchOnlyWallet.setSecret(
      `{"ExtPubKey":"${signerWallet.getXpub()}","MasterFingerprint":"${signerWallet.getMasterFingerprintHex()}","AccountKeyPath":"${signerWallet.getDerivationPath()}"}`,
    );
    watchOnlyWallet.init();

    // hardcoding valid utxo (unspent at the momend of coding):
    const utxos = [
      {
        height: 707112,
        value: 10000,
        address: 'bc1q79hsqzg9q6d36ftyncwv2drg7pyt66pamghn9n',
        vout: 0,
        txid: 'e598c705bef463e2e12d7bebc15e3cf0a34477679c3c21de9693987c6de8f15e',
        wif: false,
        confirmations: 1,
      },
    ];

    // creating a tx on watch-only wallet:
    const { psbt } = watchOnlyWallet.createTransaction(
      utxos,
      [{ address: '13HaCAB4jf7FYSZexJxoczyDDnutzZigjS', value: 1000 }],
      1,
      watchOnlyWallet._getInternalAddressByIndex(0),
    );
    assert.strictEqual(psbt.data.outputs.length, 2);
    assert.strictEqual(psbt.data.inputs.length, 1);

    // signing this tx with signer wallet
    const { tx } = signerWallet.cosignPsbt(psbt);
    assert.ok(tx);
    assert.ok(tx.toHex());

    assert.strictEqual(
      tx.toHex(),
      '020000000001015ef1e86d7c989396de213c9c677744a3f03c5ec1eb7b2de1e263f4be05c798e500000000000000008002e8030000000000001976a91419129d53e6319baf19dba059bead166df90ab8f588ac9622000000000000160014063e495b0228ad29d537f90586ff0965718ee78602483045022100f56f9337a7c4f2e4176852131a6176bdf72daab1a64c6c00d1e4ae8a53c0caf50220159f36793bad0bbacdff5660991c3246d9930796a0a34a9d7a8f4bc3da67c9d90121024328b820f06c591b1a8790a4a3ee7a8679f672879b750a205d6e2c02660e19ac00000000',
    );
  });
  */
});
