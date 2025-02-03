import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { I18nManager, Image, LayoutAnimation, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {MultisigHDWallet } from '../class';
import WalletGradient from '../class/wallet-gradient';
import { TWallet } from '../class/wallets/types';
import loc, { formatBalance, formatBalanceWithoutSuffix } from '../loc';
import { DoichainUnit } from '../models/doichainUnits';
import { FiatUnit } from '../models/fiatUnit';
import { BlurredBalanceView } from './BlurredBalanceView';
import { useSettings } from '../hooks/context/useSettings';
import ToolTipMenu from './TooltipMenu';

interface TransactionsNavigationHeaderProps {
  wallet: TWallet;
  unit: DoichainUnit;
  onWalletUnitChange: (unit: DoichainUnit) => void;
  onManageFundsPressed?: (id?: string) => void;
  onWalletBalanceVisibilityChange?: (isShouldBeVisible: boolean) => void;
}

const TransactionsNavigationHeader: React.FC<TransactionsNavigationHeaderProps> = ({
  wallet: initialWallet,
  onWalletUnitChange,
  onManageFundsPressed,
  onWalletBalanceVisibilityChange,
  unit = DoichainUnit.DOI,
}) => {
  const [wallet, setWallet] = useState(initialWallet);
  const [allowOnchainAddress, setAllowOnchainAddress] = useState(false);
  const { preferredFiatCurrency } = useSettings();

  const verifyIfWalletAllowsOnchainAddress = useCallback(() => {
    
  }, [wallet]);

  useEffect(() => {
    setWallet(initialWallet);
  }, [initialWallet]);

  
  const handleCopyPress = useCallback(() => {
    const value = formatBalance(wallet.getBalance(), unit);
    if (value) {
      Clipboard.setString(value);
    }
  }, [unit, wallet]);

  const handleBalanceVisibility = useCallback(() => {
    onWalletBalanceVisibilityChange?.(!wallet.hideBalance);
  }, [onWalletBalanceVisibilityChange, wallet.hideBalance]);

  const changeWalletBalanceUnit = () => {
    let newWalletPreferredUnit = wallet.getPreferredBalanceUnit();

    if (newWalletPreferredUnit === DoichainUnit.DOI) {
      newWalletPreferredUnit = DoichainUnit.SWARTZ;
    } else if (newWalletPreferredUnit === DoichainUnit.SWARTZ) {
      newWalletPreferredUnit = DoichainUnit.LOCAL_CURRENCY;
    } else {
      newWalletPreferredUnit = DoichainUnit.DOI;
    }

    onWalletUnitChange(newWalletPreferredUnit);
  };

  const handleManageFundsPressed = useCallback(
    (actionKeyID?: string) => {
      if (onManageFundsPressed) {
        onManageFundsPressed(actionKeyID);
      }
    },
    [onManageFundsPressed],
  );

  const onPressMenuItem = useCallback(
    (id: string) => {
      if (id === 'walletBalanceVisibility') {
        handleBalanceVisibility();
      } else if (id === 'copyToClipboard') {
        handleCopyPress();
      }
    },
    [handleBalanceVisibility, handleCopyPress],
  );

  const toolTipActions = useMemo(() => {
    return [
      {
        id: actionKeys.Refill,
        text: loc.lnd.refill,
        icon: actionIcons.Refill,
      },
      {
        id: actionKeys.RefillWithExternalWallet,
        text: loc.lnd.refill_external,
        icon: actionIcons.RefillWithExternalWallet,
      },
    ];
  }, []);

  const balance = useMemo(() => {
    const hideBalance = wallet.hideBalance;
    const balanceFormatted =
      unit === DoichainUnit.LOCAL_CURRENCY
        ? formatBalance(wallet.getBalance(), unit, true)
        : formatBalanceWithoutSuffix(wallet.getBalance(), unit, true);
    return !hideBalance && balanceFormatted;
  }, [unit, wallet]);

  const toolTipWalletBalanceActions = useMemo(() => {
    return wallet.hideBalance
      ? [
          {
            id: 'walletBalanceVisibility',
            text: loc.transactions.details_balance_show,
            icon: {
              iconValue: 'eye',
            },
          },
        ]
      : [
          {
            id: 'walletBalanceVisibility',
            text: loc.transactions.details_balance_hide,
            icon: {
              iconValue: 'eye.slash',
            },
          },
          {
            id: 'copyToClipboard',
            text: loc.transactions.details_copy,
            icon: {
              iconValue: 'doc.on.doc',
            },
          },
        ];
  }, [wallet.hideBalance]);

  const imageSource = useMemo(() => {
    switch (wallet.type) {     
      case MultisigHDWallet.type:
        return I18nManager.isRTL ? require('../img/vault-shape-rtl.png') : require('../img/vault-shape.png');
      default:
        return I18nManager.isRTL ? require('../img/btc-shape-rtl.png') : require('../img/btc-shape.png');
    }
  }, [wallet.type]);

  // Custom hook to store previous value
  const usePrevious = (value: any) => {
    const ref = useRef();
    useEffect(() => {
      ref.current = value;
    }, [value]);
    return ref.current;
  };

  // Use previous values to determine if updates have occurred
  const prevBalance = usePrevious(balance);
  useEffect(() => {
    if (prevBalance !== undefined && prevBalance !== balance) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [balance, prevBalance]);

  const prevHideBalance = usePrevious(wallet.hideBalance);
  useEffect(() => {
    if (prevHideBalance !== undefined && prevHideBalance !== wallet.hideBalance) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [wallet.hideBalance, prevHideBalance]);

  const prevUnit = usePrevious(unit);
  useEffect(() => {
    if (prevUnit !== undefined && prevUnit !== unit) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [unit, prevUnit]);

  const prevWalletID = usePrevious(wallet.getID?.());
  useEffect(() => {
    if (prevWalletID !== undefined && prevWalletID !== initialWallet.getID?.()) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [initialWallet, prevWalletID]);

  return (
    <LinearGradient
      colors={WalletGradient.gradientsFor(wallet.type)}
      style={styles.lineaderGradient}
      {...WalletGradient.linearGradientProps(wallet.type)}
    >
      <Image source={imageSource} style={styles.chainIcon} />

      <Text testID="WalletLabel" numberOfLines={1} style={styles.walletLabel} selectable>
        {wallet.getLabel()}
      </Text>
      <View style={styles.walletBalanceAndUnitContainer}>
        <ToolTipMenu
          isMenuPrimaryAction
          isButton
          enableAndroidRipple={false}
          buttonStyle={styles.walletBalance}
          onPressMenuItem={onPressMenuItem}
          actions={toolTipWalletBalanceActions}
        >
          <View style={styles.walletBalance}>
            {wallet.hideBalance ? (
              <BlurredBalanceView />
            ) : (
              <View>
                <Text
                  testID="WalletBalance"
                  // @ts-ignore: Ugh
                  key={balance} // force component recreation on balance change. To fix right-to-left languages, like Farsi
                  numberOfLines={1}
                  minimumFontScale={0.5}
                  adjustsFontSizeToFit
                  style={styles.walletBalanceText}
                >
                  {balance}
                </Text>
              </View>
            )}
          </View>
        </ToolTipMenu>
        <TouchableOpacity style={styles.walletPreferredUnitView} onPress={changeWalletBalanceUnit}>
          <Text style={styles.walletPreferredUnitText}>
            {unit === DoichainUnit.LOCAL_CURRENCY ? (preferredFiatCurrency?.endPointKey ?? FiatUnit.USD) : unit}
          </Text>
        </TouchableOpacity>
      </View>
      
      {wallet.type === MultisigHDWallet.type && (
        <TouchableOpacity
          style={styles.manageFundsButton}
          accessibilityRole="button"
          onPress={() => handleManageFundsPressed()}
        >
          <Text style={styles.manageFundsButtonText}>{loc.multisig.manage_keys}</Text>
        </TouchableOpacity>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  lineaderGradient: {
    padding: 15,
    minHeight: 140,
    justifyContent: 'center',
  },
  chainIcon: {
    width: 99,
    height: 94,
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  walletLabel: {
    backgroundColor: 'transparent',
    fontSize: 19,
    color: '#fff',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    marginBottom: 10,
  },
  walletBalance: {
    flexShrink: 1,
    marginRight: 6,
  },
  manageFundsButton: {
    marginTop: 14,
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9,
    minHeight: 39,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  manageFundsButtonText: {
    fontWeight: '500',
    fontSize: 14,
    color: '#FFFFFF',
    padding: 12,
  },
  walletBalanceAndUnitContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10, // Ensure there's some padding to the right
  },
  walletBalanceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 36,
    flexShrink: 1, // Allow the text to shrink if there's not enough space
  },
  walletPreferredUnitView: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 8,
    minHeight: 35,
    minWidth: 65,
  },
  walletPreferredUnitText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export const actionKeys = {
  CopyToClipboard: 'copyToClipboard',
  WalletBalanceVisibility: 'walletBalanceVisibility',
  Refill: 'refill',
  RefillWithExternalWallet: 'refillWithExternalWallet',
};

export const actionIcons = {
  Eye: {
    iconValue: 'eye',
  },
  EyeSlash: {
    iconValue: 'eye.slash',
  },
  Clipboard: {
    iconValue: 'doc.on.doc',
  },
  Refill: {
    iconValue: 'goforward.plus',
  },
  RefillWithExternalWallet: {
    iconValue: 'qrcode',
  },
};

export default TransactionsNavigationHeader;
