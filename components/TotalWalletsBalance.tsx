import React, { useMemo, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet, LayoutAnimation, View } from 'react-native';
import { useStorage } from '../hooks/context/useStorage';
import loc, { formatBalanceWithoutSuffix } from '../loc';
import { DoichainUnit} from '../models/doichainUnits';
import ToolTipMenu from './TooltipMenu';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { useSettings } from '../hooks/context/useSettings';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from './themes';

export const TotalWalletsBalancePreferredUnit = 'TotalWalletsBalancePreferredUnit';
export const TotalWalletsBalanceKey = 'TotalWalletsBalance';

const TotalWalletsBalance: React.FC = React.memo(() => {
  const { wallets } = useStorage();
  const {
    preferredFiatCurrency,
    isTotalBalanceEnabled,
    setIsTotalBalanceEnabledStorage,
    totalBalancePreferredUnit,
    setTotalBalancePreferredUnitStorage,
  } = useSettings();
  const { colors } = useTheme();

  const styleHooks = useMemo(
    () => ({
      balance: { color: colors.foregroundColor },
      currency: { color: colors.foregroundColor },
    }),
    [colors.foregroundColor],
  );

  const totalBalance = useMemo(() => {
    return wallets.reduce((prev, curr) => {
      if (!curr.hideBalance) {
        const balance = curr.getBalance();
        return prev + (typeof balance === 'number' ? balance : 0);
      }
      return prev;
    }, 0);
  }, [wallets]);

  const formattedBalance = useMemo(() => {
    return formatBalanceWithoutSuffix(totalBalance, totalBalancePreferredUnit, true);
  }, [totalBalance, totalBalancePreferredUnit]);

  const toolTipActions = useMemo(() => {
    const viewInFiat = {
      ...CommonToolTipActions.ViewInFiat,
      text: loc.formatString(loc.total_balance_view.view_in_fiat, { currency: preferredFiatCurrency.endPointKey }),
      hidden: totalBalancePreferredUnit === DoichainUnit.LOCAL_CURRENCY,
    };

    if (totalBalancePreferredUnit === DoichainUnit.SWARTZ) {
      viewIn = {
        ...CommonToolTipActions.ViewInFiat,
        text: loc.formatString(loc.total_balance_view.view_in_fiat, { currency: preferredFiatCurrency.endPointKey }),
      };
    } else if (totalBalancePreferredUnit === DoichainUnit.LOCAL_CURRENCY) {
      viewIn = CommonToolTipActions.ViewInBitcoin;
    } else if (totalBalancePreferredUnit === DoichainUnit.DOI) {
      viewIn = CommonToolTipActions.ViewInSats;
    } else {
      viewIn = CommonToolTipActions.ViewInBitcoin;
    }
    const viewInSats = {
      ...CommonToolTipActions.ViewInSats,
      hidden: totalBalancePreferredUnit === DoichainUnit.SWARTZ,
    };

    const viewInBitcoin = {
      ...CommonToolTipActions.ViewInBitcoin,
      hidden: totalBalancePreferredUnit === DoichainUnit.DOI,
    };

    const viewInActions = {
      id: 'viewInActions',
      text: '',
      subactions: [viewInFiat, viewInSats, viewInBitcoin],
      displayInline: true,
    };

    return [viewInActions, CommonToolTipActions.CopyAmount, CommonToolTipActions.HideBalance];
  }, [preferredFiatCurrency, totalBalancePreferredUnit]);

  const onPressMenuItem = useMemo(
    () => async (id: string | number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      switch (id) {
        case CommonToolTipActions.ViewInFiat.id:
          await setTotalBalancePreferredUnitStorage(DoichainUnit.LOCAL_CURRENCY);
          break;
        case CommonToolTipActions.ViewInSats.id:
          await setTotalBalancePreferredUnitStorage(DoichainUnit.SWARTZ);
          break;
        case CommonToolTipActions.ViewInBitcoin.id:
          await setTotalBalancePreferredUnitStorage(DoichainUnit.DOI);
          break;
        case CommonToolTipActions.HideBalance.id:
          await setIsTotalBalanceEnabledStorage(false);
          break;
        case CommonToolTipActions.CopyAmount.id:
          Clipboard.setString(formattedBalance.toString());
          break;
        default:
          break;
      }
    },
    [setIsTotalBalanceEnabledStorage, formattedBalance, setTotalBalancePreferredUnitStorage],
  );

  const handleBalanceOnPress = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    let nextUnit: DoichainUnit;
    switch (totalBalancePreferredUnit) {
      case DoichainUnit.DOI:
        nextUnit = DoichainUnit.SWARTZ;
        break;
      case DoichainUnit.SWARTZ:
        nextUnit = DoichainUnit.LOCAL_CURRENCY;
        break;
      default:
        nextUnit = DoichainUnit.DOI;
    }
    await setTotalBalancePreferredUnitStorage(nextUnit);
  }, [totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage]);

  // If there's only one wallet or total balance view is disabled, don't render
  if (wallets.length <= 1 || !isTotalBalanceEnabled) return null;

  return (
    (wallets.length > 1 && (
      <ToolTipMenu actions={toolTipActions} onPressMenuItem={onPressMenuItem}>
        <View style={styles.container}>
          <Text style={styles.label}>{loc.wallets.total_balance}</Text>
          <TouchableOpacity onPress={() => onPressMenuItem(CommonToolTipActions.ViewInBitcoin.id)}>
            <Text style={[styles.balance, styleHooks.balance]}>
              {formattedBalance}{' '}
              {totalBalancePreferredUnit !== DoichainUnit.LOCAL_CURRENCY && (
                <Text style={[styles.currency, styleHooks.currency]}>{totalBalancePreferredUnit}</Text>
              )}
            </Text>
          </TouchableOpacity>
        </View>
      </ToolTipMenu>
    )) ||
    null
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    color: '#9BA0A9',
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
  currency: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1D2B53',
  },
});

export default TotalWalletsBalance;
