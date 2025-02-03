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

const TotalWalletsBalance: React.FC = () => {
  const { wallets } = useStorage();
  const { preferredFiatCurrency, setIsTotalBalanceEnabledStorage, totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage } =
    useSettings();
  const { colors } = useTheme();

  const styleHooks = useMemo(
    () => ({
      balance: { color: colors.foregroundColor },
      currency: { color: colors.foregroundColor },
    }),
    [colors.foregroundColor],
  );

  const totalBalance = useMemo(() => wallets.reduce((prev, curr) => (!curr.hideBalance ? prev + curr.getBalance() : prev), 0), [wallets]);

  const formattedBalance = useMemo(
    () => formatBalanceWithoutSuffix(totalBalance, totalBalancePreferredUnit, true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalBalance, totalBalancePreferredUnit, preferredFiatCurrency],
  );

  const toolTipActions = useMemo(() => {
    const viewInFiat = {
      ...CommonToolTipActions.ViewInFiat,
      text: loc.formatString(loc.total_balance_view.view_in_fiat, { currency: preferredFiatCurrency.endPointKey }),
      hidden: totalBalancePreferredUnit === BitcoinUnit.LOCAL_CURRENCY,
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
      hidden: totalBalancePreferredUnit === BitcoinUnit.SATS,
    };

    const viewInBitcoin = {
      ...CommonToolTipActions.ViewInBitcoin,
      hidden: totalBalancePreferredUnit === BitcoinUnit.BTC,
    };

    const viewInActions = {
      id: 'viewInActions',
      text: '',
      subactions: [viewInFiat, viewInSats, viewInBitcoin],
      displayInline: true,
    };

    return [viewInActions, CommonToolTipActions.CopyAmount, CommonToolTipActions.HideBalance];
  }, [preferredFiatCurrency.endPointKey, totalBalancePreferredUnit]);

  const onPressMenuItem = useMemo(
    () => async (id: string | number) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      switch (id) {
        case CommonToolTipActions.ViewInFiat.id:
        case CommonToolTipActions.ViewInBitcoin.id:
        case CommonToolTipActions.ViewInSats.id:
          switch (totalBalancePreferredUnit) {
            case DoichainUnit.DOI:
              await setTotalBalancePreferredUnitStorage(DoichainUnit.SWARTZ);
              break;
            case DoichainUnit.SWARTZ:
              await setTotalBalancePreferredUnitStorage(DoichainUnit.LOCAL_CURRENCY);
              break;
            case DoichainUnit.LOCAL_CURRENCY:
              await setTotalBalancePreferredUnitStorage(DoichainUnit.DOI);
              break;
            default:
              break;
          }
          break;
        case CommonToolTipActions.HideBalance.id:
          setIsTotalBalanceEnabledStorage(false);
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
    const nextUnit =
      totalBalancePreferredUnit === BitcoinUnit.BTC
        ? BitcoinUnit.SATS
        : totalBalancePreferredUnit === BitcoinUnit.SATS
          ? BitcoinUnit.LOCAL_CURRENCY
          : BitcoinUnit.BTC;
    await setTotalBalancePreferredUnitStorage(nextUnit);
  }, [totalBalancePreferredUnit, setTotalBalancePreferredUnitStorage]);

  if (wallets.length <= 1) return null;

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
};

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
