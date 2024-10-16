import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';

import triggerHapticFeedback, { HapticFeedbackTypes } from '../blue_modules/hapticFeedback';
import ecc from '../blue_modules/noble_ecc';
import presentAlert from '../components/Alert';
const ECPair = ECPairFactory(ecc);
import { DOICHAIN } from "../blue_modules/network.js";

const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

// Implements IPayjoinClientWallet
// https://github.com/bitcoinjs/payjoin-client/blob/master/ts_src/wallet.ts
export default class PayjoinTransaction {
  constructor(psbt, broadcast, wallet) {
    this._psbt = psbt;
    this._broadcast = broadcast;
    this._wallet = wallet;
    this._payjoinPsbt = false;
  }

  async getPsbt() {
    // Nasty hack to get this working for now
    const unfinalized = this._psbt.clone();
    for (const [index, input] of unfinalized.data.inputs.entries()) {
      delete input.finalScriptWitness;

      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script, DOICHAIN);
      const wif = this._wallet._getWifForAddress(address);
      const keyPair = ECPair.fromWIF(wif, DOICHAIN);

      unfinalized.signInput(index, keyPair);
    }

    return unfinalized;
  }

  /**
   * Doesnt conform to spec but needed for user-facing wallet software to find out txid of payjoined transaction
   *
   * @returns {boolean|Psbt}
   */
  getPayjoinPsbt() {
    return this._payjoinPsbt;
  }

  async signPsbt(payjoinPsbt) {
    // Do this without relying on private methods

    for (const [index, input] of payjoinPsbt.data.inputs.entries()) {
      const address = bitcoin.address.fromOutputScript(input.witnessUtxo.script, DOICHAIN);
      try {
        const wif = this._wallet._getWifForAddress(address);
        const keyPair = ECPair.fromWIF(wif, DOICHAIN);
        payjoinPsbt.signInput(index, keyPair).finalizeInput(index);
      } catch (e) {}
    }
    this._payjoinPsbt = payjoinPsbt;
    return this._payjoinPsbt;
  }

  async broadcastTx(txHex) {
    try {
      const result = await this._broadcast(txHex);
      if (!result) {
        throw new Error(`Broadcast failed`);
      }
      return '';
    } catch (e) {
      return 'Error: ' + e.message;
    }
  }

  async scheduleBroadcastTx(txHex, milliseconds) {
    delay(milliseconds).then(async () => {
      const result = await this.broadcastTx(txHex);
      if (result === '') {
        // TODO: Improve the wording of this error message
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: 'Something was wrong with the payjoin transaction, the original transaction successfully broadcast.' });
      }
    });
  }

  async isOwnOutputScript(outputScript) {
    const address = bitcoin.address.fromOutputScript(outputScript, DOICHAIN);

    return this._wallet.weOwnAddress(address);
  }
}
