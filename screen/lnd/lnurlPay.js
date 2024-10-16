import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRoute } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { I18nManager, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Icon } from '@rneui/themed';
import { DoichainUnit, Chain } from "../../models/doichainUnits";

import { btcToSatoshi, fiatToBTC, satoshiToBTC, satoshiToLocalCurrency } from '../../blue_modules/currency';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { BlueCard, BlueDismissKeyboardInputAccessory, BlueLoading, BlueSpacing20, BlueText } from '../../BlueComponents';
import Lnurl from '../../class/lnurl';
import presentAlert from '../../components/Alert';
import AmountInput from '../../components/AmountInput';
import Button from '../../components/Button';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import prompt from '../../helpers/prompt';
import { useBiometrics, unlockWithBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../../loc';

import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

/**
 * if user has default currency - fiat, attempting to pay will trigger conversion from entered in input field fiat value
 * to satoshi, and attempt to pay this satoshi value, which might be a little bit off from `min` & `max` values
 * provided by LnUrl. thats why we cache initial precise conversion rate so the reverse conversion wont be off.
 */
const _cacheFiatToSat = {};

const LnurlPay = () => {
  const { wallets } = useStorage();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();
  const { walletID, lnurl } = useRoute().params;
  /** @type {LightningCustodianWallet} */
  const wallet = wallets.find(w => w.getID() === walletID);
  const [unit, setUnit] = useState(wallet.getPreferredBalanceUnit());
  const [isLoading, setIsLoading] = useState(true);
  const [_LN, setLN] = useState();
  const [payButtonDisabled, setPayButtonDisabled] = useState(true);
  const [payload, setPayload] = useState();
  const { setParams, pop, navigate } = useExtendedNavigation();
  const [amount, setAmount] = useState();
  const { colors } = useTheme();
  const stylesHook = StyleSheet.create({
    root: {
      backgroundColor: colors.background,
    },

    walletWrapLabel: {
      color: colors.buttonAlternativeTextColor,
    },
    walletWrapBalance: {
      color: colors.buttonAlternativeTextColor,
    },
    walletWrapSats: {
      color: colors.buttonAlternativeTextColor,
    },
  });

  useEffect(() => {
    if (lnurl) {
      const ln = new Lnurl(lnurl, AsyncStorage);
      ln.callLnurlPayService()
        .then(setPayload)
        .catch(error => {
          presentAlert({ message: error.message });
          pop();
        });
      setLN(ln);
      setIsLoading(false);
    }
  }, [lnurl, pop]);

  useEffect(() => {
    setPayButtonDisabled(isLoading);
  }, [isLoading]);

  useEffect(() => {
    if (payload) {
      /** @type {Lnurl} */
      const LN = _LN;
      let originalSatAmount;
      let newAmount = (originalSatAmount = LN.getMin());
      if (!newAmount) {
        presentAlert({ message: 'Internal error: incorrect LNURL amount' });
        return;
      }
      switch (unit) {
        case DoichainUnit.DOI:
          newAmount = satoshiToBTC(newAmount);
          break;
        case DoichainUnit.LOCAL_CURRENCY:
          newAmount = satoshiToLocalCurrency(newAmount, false);
          _cacheFiatToSat[newAmount] = originalSatAmount;
          break;
      }
      setAmount(newAmount);
    }
  }, [payload]); // eslint-disable-line react-hooks/exhaustive-deps

  const onWalletSelect = w => {
    setParams({ walletID: w.getID() });
    pop();
  };

  const pay = async () => {
    setPayButtonDisabled(true);
    /** @type {Lnurl} */
    const LN = _LN;

    const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();
    if (isBiometricsEnabled) {
      if (!(await unlockWithBiometrics())) {
        return;
      }
    }

    let amountSats = amount;
    switch (unit) {
      case DoichainUnit.SWARTZ:
        amountSats = parseInt(amountSats, 10); // nop
        break;
      case DoichainUnit.DOI:
        amountSats = btcToSatoshi(amountSats);
        break;
      case DoichainUnit.LOCAL_CURRENCY:
        if (_cacheFiatToSat[amount]) {
          amountSats = _cacheFiatToSat[amount];
        } else {
          amountSats = btcToSatoshi(fiatToBTC(amountSats));
        }
        break;
    }

    let bolt11payload;
    try {
      let comment;
      if (LN.getCommentAllowed()) {
        comment = await prompt('Comment', '', false, 'plain-text');
      }

      bolt11payload = await LN.requestBolt11FromLnurlPayService(amountSats, comment);
      await wallet.payInvoice(bolt11payload.pr);
      const decoded = wallet.decodeInvoice(bolt11payload.pr);
      setPayButtonDisabled(false);

      // success, probably
      triggerHapticFeedback(HapticFeedbackTypes.NotificationSuccess);
      if (wallet.last_paid_invoice_result && wallet.last_paid_invoice_result.payment_preimage) {
        await LN.storeSuccess(decoded.payment_hash, wallet.last_paid_invoice_result.payment_preimage);
      }

      navigate('ScanLndInvoiceRoot', {
        screen: 'LnurlPaySuccess',
        params: {
          paymentHash: decoded.payment_hash,
          justPaid: true,
          fromWalletID: walletID,
        },
      });
      setIsLoading(false);
    } catch (Err) {
      console.log(Err.message);
      setIsLoading(false);
      setPayButtonDisabled(false);
      triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
      return presentAlert({ message: Err.message });
    }
  };

  const renderWalletSelectionButton = (
    <View style={styles.walletSelectRoot}>
      {!isLoading && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.walletSelectTouch}
          onPress={() => navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN })}
        >
          <Text style={styles.walletSelectText}>{loc.wallets.select_wallet.toLowerCase()}</Text>
          <Icon name={I18nManager.isRTL ? 'angle-left' : 'angle-right'} size={18} type="font-awesome" color="#9aa0aa" />
        </TouchableOpacity>
      )}
      <View style={styles.walletWrap}>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.walletWrapTouch}
          onPress={() => navigate('SelectWallet', { onWalletSelect, chainType: Chain.OFFCHAIN })}
        >
          <Text style={[styles.walletWrapLabel, stylesHook.walletWrapLabel]}>{wallet.getLabel()}</Text>
          <Text style={[styles.walletWrapBalance, stylesHook.walletWrapBalance]}>
            {formatBalanceWithoutSuffix(wallet.getBalance(), DoichainUnit.SWARTZ, false)}
          </Text>
          <Text style={[styles.walletWrapSats, stylesHook.walletWrapSats]}>{DoichainUnit.SWARTZ}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGotPayload = () => {
    return (
      <SafeArea>
        <ScrollView contentContainertyle={{ justifyContent: 'space-around' }}>
          <BlueCard>
            <AmountInput
              isLoading={isLoading}
              amount={amount && amount.toString()}
              onAmountUnitChange={setUnit}
              onChangeText={setAmount}
              disabled={payload && payload.fixed}
              unit={unit}
              inputAccessoryViewID={BlueDismissKeyboardInputAccessory.InputAccessoryViewID}
            />
            <BlueText style={styles.alignSelfCenter}>
              {loc.formatString(loc.lndViewInvoice.please_pay_between_and, {
                min: formatBalance(payload?.min, unit),
                max: formatBalance(payload?.max, unit),
              })}
            </BlueText>
            <BlueSpacing20 />
            {payload?.image && (
              <>
                <Image style={styles.img} source={{ uri: payload?.image }} />
                <BlueSpacing20 />
              </>
            )}
            <BlueText style={styles.alignSelfCenter}>{payload?.description}</BlueText>
            <BlueText style={styles.alignSelfCenter}>{payload?.domain}</BlueText>
            <BlueSpacing20 />
            {payButtonDisabled ? <BlueLoading /> : <Button title={loc.lnd.payButton} onPress={pay} />}
            <BlueSpacing20 />
          </BlueCard>
        </ScrollView>
        {renderWalletSelectionButton}
      </SafeArea>
    );
  };

  return isLoading || wallet === undefined || amount === undefined ? (
    <View style={[styles.root, stylesHook.root]}>
      <BlueLoading />
    </View>
  ) : (
    renderGotPayload()
  );
};

export default LnurlPay;

const styles = StyleSheet.create({
  img: { width: 200, height: 200, alignSelf: 'center' },
  alignSelfCenter: {
    alignSelf: 'center',
  },
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  walletSelectRoot: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  walletSelectTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletSelectText: {
    color: '#9aa0aa',
    fontSize: 14,
    marginRight: 8,
  },
  walletWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  walletWrapTouch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletWrapLabel: {
    fontSize: 14,
  },
  walletWrapBalance: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 4,
  },
  walletWrapSats: {
    fontSize: 11,
    fontWeight: '600',
    textAlignVertical: 'bottom',
    marginTop: 2,
  },
});
