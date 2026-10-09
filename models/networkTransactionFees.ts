import * as BlueElectrum from '../blue_modules/BlueElectrum';
import { MIN_RELAY_FEE_SAT_PER_VBYTE } from '../blue_modules/network.js';

export enum NetworkTransactionFeeType {
  FAST = 'Fast',
  MEDIUM = 'MEDIUM',
  SLOW = 'SLOW',
  CUSTOM = 'CUSTOM',
}

export class NetworkTransactionFee {
  static StorageKey = 'NetworkTransactionFee';

  public fastestFee: number;
  public mediumFee: number;
  public slowFee: number;

  constructor(
    fastestFee = MIN_RELAY_FEE_SAT_PER_VBYTE,
    mediumFee = MIN_RELAY_FEE_SAT_PER_VBYTE,
    slowFee = MIN_RELAY_FEE_SAT_PER_VBYTE,
  ) {
    // No preset may fall under the chain's floor: a transaction below it relays on the doi.works
    // fleet, shows as sent and is never mined (Doichain/DoiWallet#39).
    this.fastestFee = Math.max(MIN_RELAY_FEE_SAT_PER_VBYTE, fastestFee);
    this.mediumFee = Math.max(MIN_RELAY_FEE_SAT_PER_VBYTE, mediumFee);
    this.slowFee = Math.max(MIN_RELAY_FEE_SAT_PER_VBYTE, slowFee);
  }
}

export default class NetworkTransactionFees {
  static async recommendedFees(): Promise<NetworkTransactionFee> {
    try {
      const isDisabled = await BlueElectrum.isDisabled();
      if (isDisabled) {
        throw new Error('Electrum is disabled. Dont attempt to fetch fees');
      }
      const response = await BlueElectrum.estimateFees();
      return new NetworkTransactionFee(response.fast + 15, response.medium + 12, response.slow);
    } catch (err) {
      console.warn(err);
      // Without an estimate the chain's floor is the only safe answer; the old 2/1/1 fallback
      // produced transactions that could never be mined (Doichain/DoiWallet#39).
      return new NetworkTransactionFee();
    }
  }
}
