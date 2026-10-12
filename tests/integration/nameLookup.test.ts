/**
 * The name index, against a real ElectrumX server.
 *
 * This is the one part of the name work a local node cannot stand in for: the regtest setup runs
 * Doichain Core but no ElectrumX, so until this suite existed getNameOperations() and nameShow()
 * had never actually been sent to a server - and the outpoint a transfer spends comes from them
 * (Doichain/DoiWallet#35).
 *
 * The assertions are deliberately structural. The integration suite is full of tests that compare
 * against balances and heights recorded years ago and now fail for no reason other than the chain
 * having moved on; a name's holder, value and height change every time somebody updates it, so
 * none of them are pinned here.
 */
import assert from 'assert';

import * as BlueElectrum from '../../blue_modules/BlueElectrum';

jest.setTimeout(150 * 1000);

/** Registered long ago and recorded in issue 35; what matters is only that it has a history. */
const KNOWN_NAME = 'doichain';

afterAll(() => {
  BlueElectrum.forceDisconnect();
});

beforeAll(async () => {
  try {
    await BlueElectrum.connectMain();
  } catch (err) {
    console.log('failed to connect to Electrum:', err);
    process.exit(1);
  }
});

describe('name index', () => {
  it('returns every operation on a name, oldest first', async () => {
    const operations = await BlueElectrum.getNameOperations(KNOWN_NAME);
    assert.ok(operations.length > 0, `expected "${KNOWN_NAME}" to have a history`);

    let previousHeight = 0;
    for (const operation of operations) {
      assert.strictEqual(operation.name, KNOWN_NAME, 'the index returned an operation on another name');
      assert.match(operation.txid, /^[0-9a-f]{64}$/, `bad txid ${operation.txid}`);
      assert.ok(operation.vout >= 0, 'a name output needs an index');
      assert.ok(operation.address, 'a name output has a holder');
      assert.ok(typeof operation.op === 'string' && operation.op.length > 0, 'the operation names itself');

      // mempool entries come back as 0 or -1 and sort last, confirmed ones ascend
      if (operation.height > 0) {
        assert.ok(operation.height >= previousHeight, 'operations are not in order');
        previousHeight = operation.height;
      }
    }
  });

  it('names the operation that holds it, and it is the newest one', async () => {
    const operations = await BlueElectrum.getNameOperations(KNOWN_NAME);
    const state = await BlueElectrum.nameShow(KNOWN_NAME);

    assert.ok(state, 'a name with a history has a holder');
    const newest = operations[operations.length - 1];
    assert.strictEqual(state.operation.txid, newest.txid);
    assert.strictEqual(state.operation.vout, newest.vout);
  });

  it('the outpoint it hands a transfer really carries that name', async () => {
    // this is what createTransaction() is told to spend, so the output it points at has to be the
    // name output - otherwise Core answers tx-namedoi-name-mismatch
    const state = await BlueElectrum.nameShow(KNOWN_NAME);
    assert.ok(state);

    const tx = await BlueElectrum.multiGetTransactionByTxid([state.operation.txid], true);
    const output = tx[state.operation.txid].vout.find((v: any) => v.n === state.operation.vout);

    assert.ok(output, 'the outpoint does not exist in its transaction');
    assert.ok(output.scriptPubKey.nameOp, 'the outpoint is not a name output at all');
    assert.strictEqual(output.scriptPubKey.nameOp.name, KNOWN_NAME);
  });

  it('says a name nobody ever registered has no operations', async () => {
    // random, so it cannot be registered between runs and turn this flaky
    const unregistered = 'doiwallet-test-' + Math.random().toString(36).slice(2, 14);

    assert.deepStrictEqual(await BlueElectrum.getNameOperations(unregistered), []);
    assert.strictEqual(await BlueElectrum.nameShow(unregistered), null);
  });
});
