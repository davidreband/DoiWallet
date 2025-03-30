import assert from 'assert';
import * as bitcoin from '@doichain/doichainjs-lib';
import { DOICHAIN } from '../../blue_modules/network.js';

import { SegwitBech32Wallet } from '../../class';

describe('Segwit P2SH wallet', () => {
  it('can create transaction', async () => {
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG');


    assert.strictEqual(wallet.getAddress(), 'dc1qydvmn0gvk9xwdq8pzd3gxm3vtftte948y66fzj');
    assert.deepStrictEqual(wallet.getAllExternalAddresses(), ['dc1qydvmn0gvk9xwdq8pzd3gxm3vtftte948y66fzj']);
    assert.strictEqual(await wallet.getChangeAddressAsync(), wallet.getAddress());

    const feeRate = 1;
    const utxos = [
      {
        txid: '57d18bc076b919583ff074cfba6201edd577f7fe35f69147ea512e970f95ffeb',
        vout: 0,
        value: 100000,
      },
    ];


    let txNew = wallet.createTransaction(
      utxos,
      [{ value: 90000, address: 'N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP' }],
      feeRate,
      wallet.getAddress(),
    );

    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    // check fee rate up to the second decimal place
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(
      txNew.tx.toHex(),
      '02000000000101ebff950f972e51ea4791f635fef777d5ed0162bacf74f03f5819b976c08bd1570000000000ffffffff02905f0100000000001976a91462c4b1a7420992932139cb9a5e814458b932509288ac7e260000000000001600142359b9bd0cb14ce680e11362836e2c5a56bc96a7024830450221009991b0f445b3f6f78704ec5aab4279a7beb5fe9cf1c751d682513e1864153fc40220323cd2fc3a65ae597b9f075bdf0c7478344b8354d916dbf571e166a700240d88012102b58e16feba6b0ce28842b1a0aba18c85a5e945db84d0f6a3ba30b38edccfe97300000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP', bitcoin.address.fromOutputScript(tx.outs[0].script, DOICHAIN)); // to address
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script, DOICHAIN), wallet.getAddress()); // change address

    // sendMax

    txNew = wallet.createTransaction(utxos, [{ address: 'N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP' }], feeRate, wallet.getAddress());

    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP', bitcoin.address.fromOutputScript(tx.outs[0].script,DOICHAIN)); // to address

    // batch send + send max
    txNew = wallet.createTransaction(
      utxos,

      [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }, { address: '6VZxBkWzXYdhzX2Brq3hnQ6f8KYRDYNa4y', value: 10000 }],
      feeRate,

      wallet.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual('14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', bitcoin.address.fromOutputScript(tx.outs[1].script)); // to address
  });

  it('can create transaction with decimal fee rate', async () => {
    const wallet = new SegwitBech32Wallet();
    wallet.setSecret('L4vn2KxgMLrEVpxjfLwxfjnPPQMnx42DCjZJ2H7nN4mdHDyEUWXd');
    assert.strictEqual(wallet.getAddress(), 'bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe');
    assert.deepStrictEqual(wallet.getAllExternalAddresses(), ['bc1q3rl0mkyk0zrtxfmqn9wpcd3gnaz00yv9yp0hxe']);
    assert.strictEqual(await wallet.getChangeAddressAsync(), wallet.getAddress());

    const feeRate = 1.5;
    const utxos = [
      {
        txid: '57d18bc076b919583ff074cfba6201edd577f7fe35f69147ea512e970f95ffeb',
        vout: 0,
        value: 100000,
      },
    ];

    let txNew = wallet.createTransaction(
      utxos,
      [{ value: 90000, address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }],
      feeRate,
      wallet.getAddress(),
    );
    let tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    // check fee rate up to the second decimal place
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(
      txNew.tx.toHex(),
      '02000000000101ebff950f972e51ea4791f635fef777d5ed0162bacf74f03f5819b976c08bd1570000000000ffffffff02905f0100000000001976a914aa381cd428a4e91327fd4434aa0a08ff131f1a5a88ac352600000000000016001488fefdd8967886b32760995c1c36289f44f7918502483045022100ad3ae70792176c44718c0a3b6fd59012e8ca36b080265b91fcc861b36c3fb06402202fa1317fe07c192581f9eebdb137c5f1ba7d666d07ed6e0548d7dff3669b748401210314cf2bf53f221e58c5adc1dd95adba9239b248f39b09eb2c550aadc1926fe7aa00000000',
    );
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address
    assert.strictEqual(bitcoin.address.fromOutputScript(tx.outs[1].script), wallet.getAddress()); // change address

    // sendMax
    txNew = wallet.createTransaction(utxos, [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }], feeRate, wallet.getAddress());
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 1);
    assert.strictEqual('1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB', bitcoin.address.fromOutputScript(tx.outs[0].script)); // to address

    // batch send + send max
    txNew = wallet.createTransaction(
      utxos,
      [{ address: '1GX36PGBUrF8XahZEGQqHqnJGW2vCZteoB' }, { address: '14YZ6iymQtBVQJk6gKnLCk49UScJK7SH4M', value: 10000 }],
      feeRate,
      wallet.getAddress(),
    );
    tx = bitcoin.Transaction.fromHex(txNew.tx.toHex());
    assert.strictEqual(Math.round((txNew.fee / tx.virtualSize()) * 10), feeRate * 10);
    assert.strictEqual(tx.ins.length, 1);
    assert.strictEqual(tx.outs.length, 2);
    assert.strictEqual('N5ac3ywbkm11zVrtUfBFkRPhcjAygsc3SP', bitcoin.address.fromOutputScript(tx.outs[0].script,DOICHAIN)); // to address
    assert.strictEqual('6VZxBkWzXYdhzX2Brq3hnQ6f8KYRDYNa4y', bitcoin.address.fromOutputScript(tx.outs[1].script,DOICHAIN)); // to address
  });

  it('can sign and verify messages', async () => {
    const l = new SegwitBech32Wallet();
    l.setSecret('TkpCRCZ7tPwcHWjVHGrFdeYYL5sbQ5FzU4JmzUx3BDDMiKcw2yUG'); // from bitcoinjs-message examples

    const signature = l.signMessage('This is an example of a signed message.', l.getAddress());
    assert.strictEqual(signature, 'J4X/eco2cjmFb4L2+gts0RpUlMxaOQ9WJc40TSL6wQ5/UG9qbxhdnWqIoPqtcqmqx0j34ehWnoL6vUg3MvpqPuU=');
    assert.strictEqual(l.verifyMessage('This is an example of a signed message.', l.getAddress(), signature), true);
  });
});
