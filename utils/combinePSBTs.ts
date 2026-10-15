import * as bitcoin from '@doichain/doichainjs-lib';

import { DOICHAIN } from '../blue_modules/network.js';

/**
 * Combines two PSBTs and returns the combined PSBT.
 * @param {string} psbtBase64 - The base64 string of the first PSBT.
 * @param {string} newPSBTBase64 - The base64 string of the new PSBT to combine.
 * @returns {bitcoin.Psbt} - The combined PSBT.
 */
interface CombinePSBTsParams {
  psbtBase64: string;
  newPSBTBase64: string;
}

export const combinePSBTs = ({ psbtBase64, newPSBTBase64 }: CombinePSBTsParams): bitcoin.Psbt => {
  if (psbtBase64 === newPSBTBase64) {
    return bitcoin.Psbt.fromBase64(psbtBase64, { network: DOICHAIN });
  }
  try {
    const psbt = bitcoin.Psbt.fromBase64(psbtBase64, { network: DOICHAIN });
    const newPsbt = bitcoin.Psbt.fromBase64(newPSBTBase64, { network: DOICHAIN });
    psbt.combine(newPsbt);
    return psbt;
  } catch (err) {
    console.error('Error combining PSBTs:', err);
    throw err;
  }
};
