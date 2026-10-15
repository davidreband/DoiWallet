/**
 * Guard for Doichain/DoiWallet#39 - no fee below what the miner relays at.
 */
import assert from 'assert';

import { MIN_RELAY_FEE_SAT_PER_VBYTE } from '../../blue_modules/network.js';

jest.mock('../../blue_modules/BlueElectrum');

describe('#39 - no fee below the chain floor', () => {
  const BlueElectrum = require('../../blue_modules/BlueElectrum');

  const NetworkTransactionFees = require('../../models/networkTransactionFees').default;

  const { NetworkTransactionFee } = require('../../models/networkTransactionFees');

  it('is the floor Core relays at', () => {
    // DEFAULT_MIN_RELAY_TX_FEE is COIN/1000 per kvB
    assert.strictEqual(MIN_RELAY_FEE_SAT_PER_VBYTE, 100);
  });

  it('lifts an estimate that came back under the floor', async () => {
    // what the doi.works servers actually answer on a near-empty chain
    BlueElectrum.isDisabled.mockResolvedValue(false);
    BlueElectrum.estimateFees.mockResolvedValue({ fast: 1, medium: 1, slow: 1 });

    const fees = await NetworkTransactionFees.recommendedFees();
    assert.ok(fees.fastestFee >= MIN_RELAY_FEE_SAT_PER_VBYTE, `fast was ${fees.fastestFee}`);
    assert.ok(fees.mediumFee >= MIN_RELAY_FEE_SAT_PER_VBYTE, `medium was ${fees.mediumFee}`);
    assert.ok(fees.slowFee >= MIN_RELAY_FEE_SAT_PER_VBYTE, `slow was ${fees.slowFee}`);
  });

  it('falls back to the floor when there is no estimate at all', async () => {
    BlueElectrum.isDisabled.mockResolvedValue(true); // throws inside, takes the catch path

    const fees = await NetworkTransactionFees.recommendedFees();
    assert.strictEqual(fees.fastestFee, MIN_RELAY_FEE_SAT_PER_VBYTE);
    assert.strictEqual(fees.mediumFee, MIN_RELAY_FEE_SAT_PER_VBYTE);
    assert.strictEqual(fees.slowFee, MIN_RELAY_FEE_SAT_PER_VBYTE);
  });

  it('leaves an estimate above the floor alone - this is a floor, not a price', async () => {
    BlueElectrum.isDisabled.mockResolvedValue(false);
    BlueElectrum.estimateFees.mockResolvedValue({ fast: 500, medium: 400, slow: 300 });

    const fees = await NetworkTransactionFees.recommendedFees();
    assert.ok(fees.fastestFee >= 500);
    assert.ok(fees.slowFee >= 300);
  });

  it('clamps whatever is handed to the constructor, so no caller can go under', () => {
    const fees = new NetworkTransactionFee(2, 1, 1);
    assert.strictEqual(fees.fastestFee, MIN_RELAY_FEE_SAT_PER_VBYTE);
    assert.strictEqual(fees.slowFee, MIN_RELAY_FEE_SAT_PER_VBYTE);
  });
});
