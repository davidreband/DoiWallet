import React, { useMemo } from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import { StyleSheet, Text, View } from 'react-native';
import { ListItem } from '@rneui/themed';
import Share from 'react-native-share';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import confirm from '../../helpers/confirm';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import loc, { formatBalance } from '../../loc';
import { DoichainUnit } from '../../models/doichainUnits';
import presentAlert from '../Alert';
import QRCodeComponent from '../QRCodeComponent';
import { useTheme } from '../themes';
import { AddressTypeBadge } from './AddressTypeBadge';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DetailViewStackParamList } from '../../navigation/DetailViewStackParamList';
import { useStorage } from '../../hooks/context/useStorage';
import ToolTipMenu from '../TooltipMenu';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';

interface AddressItemProps {
  item: any;
  balanceUnit: DoichainUnit;
  walletID: string;
  allowSignVerifyMessage: boolean;
}

type NavigationProps = NativeStackNavigationProp<DetailViewStackParamList>;

const AddressItem = ({ item, balanceUnit, walletID, allowSignVerifyMessage }: AddressItemProps) => {
  const { wallets } = useStorage();
  const { colors } = useTheme();
  const { isBiometricUseCapableAndEnabled } = useBiometrics();

  const hasTransactions = item.transactions > 0;

  const stylesHook = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
    },
    list: {
      color: colors.buttonTextColor,
    },
    index: {
      color: colors.alternativeTextColor,
    },
    balance: {
      color: colors.alternativeTextColor,
    },
    address: {
      color: hasTransactions ? colors.darkGray : colors.buttonTextColor,
    },
  });

  const { navigate } = useNavigation<NavigationProps>();

  const navigateToReceive = () => {
    navigate('ReceiveDetailsRoot', {
      screen: 'ReceiveDetails',
      params: {
        walletID,
        address: item.address,
      },
    });
  };

  const navigateToSignVerify = () => {
    navigate('SignVerifyRoot', {
      screen: 'SignVerify',
      params: {
        walletID,
        address: item.address,
      },
    });
  };

  const menuActions = useMemo(
    () =>
      [
        CommonToolTipActions.CopyTXID,
        CommonToolTipActions.Share,
        {
          ...CommonToolTipActions.SignVerify,
          hidden: !allowSignVerifyMessage,
        },
        {
          ...CommonToolTipActions.ExportPrivateKey,
          hidden: !allowSignVerifyMessage,
        },
      ].filter(action => !action.hidden),
    [allowSignVerifyMessage],
  );

  const balance = formatBalance(item.balance, balanceUnit, true);

  const handleCopyPress = () => {
    Clipboard.setString(item.address);
  };

  const handleSharePress = () => {
    Share.open({ message: item.address }).catch(error => console.log(error));
  };

  const handleCopyPrivkeyPress = () => {
    const wallet = wallets.find(w => w.getID() === walletID);
    if (!wallet) {
      presentAlert({ message: 'Internal error: cant find wallet' });
      return;
    }

    try {
      const wif = wallet._getWIFbyAddress(item.address);
      if (!wif) {
        presentAlert({ message: 'Internal error: cant get WIF from the wallet' });
        return;
      }
      triggerHapticFeedback(HapticFeedbackTypes.Selection);
      Clipboard.setString(wif);
    } catch (error: any) {
      presentAlert({ message: error.message });
    }
  };

  const onToolTipPress = async (id: string) => {
    if (id === CommonToolTipActions.CopyTXID.id) {
      handleCopyPress();
    } else if (id === CommonToolTipActions.Share.id) {
      handleSharePress();
    } else if (id === CommonToolTipActions.SignVerify.id) {
      navigateToSignVerify();
    } else if (id === CommonToolTipActions.ExportPrivateKey.id) {
      if (await confirm(loc.addresses.sensitive_private_key)) {
        if (await isBiometricUseCapableAndEnabled()) {
          if (!(await unlockWithBiometrics())) {
            return;
          }
        }
        handleCopyPrivkeyPress();
      }
    }
  };

  const renderPreview = () => {
    return <QRCodeComponent value={item.address} isMenuAvailable={false} />;
  };

  return (
    <ToolTipMenu
      title={item.address}
      actions={menuActions}
      onPressMenuItem={onToolTipPress}
      renderPreview={renderPreview}
      onPress={navigateToReceive}
      isButton
    >
      <ListItem key={item.key} containerStyle={stylesHook.container}>
        <ListItem.Content style={stylesHook.list}>
          <ListItem.Title style={stylesHook.list} numberOfLines={1} ellipsizeMode="middle">
            <Text style={[styles.index, stylesHook.index]}>{item.index + 1}</Text>{' '}
            <Text style={[stylesHook.address, styles.address]}>{item.address}</Text>
          </ListItem.Title>
          <View style={styles.subtitle}>
            <Text style={[stylesHook.list, styles.balance, stylesHook.balance]}>{balance}</Text>
          </View>
        </ListItem.Content>
        <View>
          <AddressTypeBadge isInternal={item.isInternal} hasTransactions={hasTransactions} />
          <Text style={[stylesHook.list, styles.balance, stylesHook.balance]}>
            {loc.addresses.transactions}: {item.transactions}
          </Text>
        </View>
      </ListItem>
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  address: {
    fontWeight: 'bold',
    marginHorizontal: 40,
  },
  index: {
    fontSize: 15,
  },
  balance: {
    marginTop: 8,
    marginLeft: 14,
  },
  subtitle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
});

export { AddressItem };
