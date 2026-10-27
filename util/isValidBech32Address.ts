import * as bitcoin from '@doichain/doichainjs-lib';

export function isValidBech32Address(address: string): boolean {
  try {
    bitcoin.address.fromBech32(address);
    return true;
  } catch (e) {
    return false;
  }
}