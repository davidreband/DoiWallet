import assert from 'assert';
import { nameops } from '@doichain/doichainjs-lib';

import { NameOperation, readNameState, sortNameOperations } from '../../utils/nameState';

const op = (height: number, txid: string): NameOperation => ({
  txid,
  vout: 0,
  height,
  op: 'name_doi',
  name: 'doichain',
  value: '',
  address: 'DGy1SMD9ioKcTdwhsL1tUByRYNRdrJXGQL',
});

describe('name lookup through the ElectrumX name index', () => {
  it('builds the index script and hash the way ElectrumX does', () => {
    // measured on 17 September 2026 against itchy-jellyfish-89.doi.works, ElectrumX 1.15.0, as
    // recorded in Doichain/DoiWallet#35 - another encoding yields another hash, and then a name
    // that is taken looks free
    assert.strictEqual(nameops.nameIndexScript('doichain').toString('hex'), '5308646f69636861696e006d756a');
    assert.strictEqual(nameops.nameIndexScriptHash('doichain'), '03cc7f01576bded817bef39ccbcca7f1fd3e878967bc30340095470c179e9bb4');

    assert.strictEqual(nameops.nameIndexScript('bitcoin').toString('hex'), '5307626974636f696e006d756a');
    assert.strictEqual(nameops.nameIndexScriptHash('bitcoin'), '58e0b0aab4833bbc04803af603ab5cc74eb55da6c62d2db6110b6d768673556f');
  });

  it('counts the name in bytes, so a non-ASCII name is not mistaken for a free one', () => {
    const name = 'hö';
    assert.strictEqual(name.length, 2);
    assert.strictEqual(Buffer.byteLength(name, 'utf8'), 3);
    // 0x53, push of 3 bytes, empty value, OP_2DROP OP_DROP OP_RETURN
    assert.strictEqual(nameops.nameIndexScript(name).toString('hex'), '5303' + Buffer.from(name, 'utf8').toString('hex') + '006d756a');
  });

  it('puts the newest operation last, with mempool entries after confirmed ones', () => {
    const sorted = sortNameOperations([op(0, 'in-mempool'), op(353030, 'older'), op(400000, 'newer')]);
    assert.deepStrictEqual(
      sorted.map(o => o.txid),
      ['older', 'newer', 'in-mempool'],
    );

    // a server that answers newest first must not change the outcome
    const reversed = sortNameOperations([op(400000, 'newer'), op(353030, 'older')]);
    assert.deepStrictEqual(
      reversed.map(o => o.txid),
      ['older', 'newer'],
    );
  });

  it('names the operation that holds the name', () => {
    const state = readNameState([op(353030, 'older'), op(400000, 'newer')]);
    assert.strictEqual(state?.operation.txid, 'newer');
    assert.strictEqual(state?.operation.vout, 0);
  });

  it('returns null for a name with no operations at all', () => {
    // not the same as "free": only the node can say whether an expired name is available again
    assert.strictEqual(readNameState([]), null);
  });
});
