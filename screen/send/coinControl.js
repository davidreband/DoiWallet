import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRoute } from '@react-navigation/native';
import PropTypes from 'prop-types';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  LayoutAnimation,
  PixelRatio,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from 'react-native';
import { Avatar, Badge, Icon, ListItem as RNElementsListItem } from '@rneui/themed';
import * as RNLocalize from 'react-native-localize';

import { DoichainUnit } from "../../models/doichainUnits";
import debounce from '../../blue_modules/debounce';
import { BlueSpacing10, BlueSpacing20 } from '../../BlueComponents';
import BottomModal from '../../components/BottomModal';
import Button from '../../components/Button';
import { FButton, FContainer } from '../../components/FloatButtons';
import ListItem from '../../components/ListItem';
import SafeArea from '../../components/SafeArea';
import { useTheme } from '../../components/themes';
import loc, { formatBalance } from '../../loc';

import { useStorage } from '../../hooks/context/useStorage';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';

const FrozenBadge = () => {
  const { colors } = useTheme();
  const oStyles = StyleSheet.create({
    freeze: { backgroundColor: colors.redBG, borderWidth: 0 },
    freezeText: { color: colors.redText },
  });
  return <Badge value={loc.cc.freeze} badgeStyle={oStyles.freeze} textStyle={oStyles.freezeText} />;
};

const ChangeBadge = () => {
  const { colors } = useTheme();
  const oStyles = StyleSheet.create({
    change: { backgroundColor: colors.buttonDisabledBackgroundColor, borderWidth: 0 },
    changeText: { color: colors.alternativeTextColor },
  });
  return <Badge value={loc.cc.change} badgeStyle={oStyles.change} textStyle={oStyles.changeText} />;
};

const OutputList = ({
  item: { address, txid, value, vout, confirmations = 0 },
  balanceUnit = DoichainUnit.DOI,
  oMemo,
  frozen,
  change,
  onOpen,
  selected,
  selectionStarted,
  onSelect,
  onDeSelect,
}) => {
  const { colors } = useTheme();
  const { txMetadata } = useStorage();
  const memo = oMemo || txMetadata[txid]?.memo || '';
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalance(value, balanceUnit, true);

  const oStyles = StyleSheet.create({
    container: {
      borderBottomColor: colors.lightBorder,
      backgroundColor: colors.elevated,
    },
    containerSelected: {
      backgroundColor: colors.ballOutgoingExpired,
      borderBottomColor: "rgba(0, 0, 0, 0)",
    },
    avatar: { borderColor: "white", borderWidth: 1, backgroundColor: color },
    amount: { fontWeight: "bold", color: colors.foregroundColor },
    memo: { fontSize: 13, marginTop: 3, color: colors.alternativeTextColor },
  });

  let onPress = onOpen;
  if (selectionStarted) {
    onPress = selected ? onDeSelect : onSelect;
  }

  return (
    <RNElementsListItem bottomDivider onPress={onPress} containerStyle={selected ? oStyles.containerSelected : oStyles.container}>
      <RNElementsListItem.CheckBox
        checkedColor="#0070FF"
        iconType="font-awesome"
        checkedIcon="check-square"
        checked={selected}
        onPress={selected ? onDeSelect : onSelect}
      />
      <RNElementsListItem.Content>
        <RNElementsListItem.Title style={oStyles.amount}>
          {amount}
        </RNElementsListItem.Title>
        <RNElementsListItem.Subtitle
          style={oStyles.memo}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {memo || address}
        </RNElementsListItem.Subtitle>
      </RNElementsListItem.Content>
      {change && <ChangeBadge />}
      {frozen && <FrozenBadge />}
    </RNElementsListItem>
  );
};

OutputList.propTypes = {
  item: PropTypes.shape({
    address: PropTypes.string.isRequired,
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    vout: PropTypes.number.isRequired,
    confirmations: PropTypes.number,
  }),
  balanceUnit: PropTypes.string,
  oMemo: PropTypes.string,
  frozen: PropTypes.bool,
  change: PropTypes.bool,
  onOpen: PropTypes.func,
  selected: PropTypes.bool,
  selectionStarted: PropTypes.bool,
  onSelect: PropTypes.func,
  onDeSelect: PropTypes.func,
};

const OutputModal = ({ item: { address, txid, value, vout, confirmations = 0 }, balanceUnit = DoichainUnit.DOI, oMemo }) => {
  const { colors } = useTheme();
  const { txMetadata } = useStorage();
  const memo = oMemo || txMetadata[txid]?.memo || '';
  const fullId = `${txid}:${vout}`;
  const color = `#${txid.substring(0, 6)}`;
  const amount = formatBalance(value, balanceUnit, true);

  const oStyles = StyleSheet.create({
    container: { paddingHorizontal: 0, borderBottomColor: colors.lightBorder, backgroundColor: 'transparent' },
    avatar: { borderColor: 'white', borderWidth: 1, backgroundColor: color },
    amount: { fontWeight: 'bold', color: colors.foregroundColor },
    tranContainer: { paddingLeft: 20 },
    tranText: { fontWeight: 'normal', fontSize: 13, color: colors.alternativeTextColor },
    memo: { fontSize: 13, marginTop: 3, color: colors.alternativeTextColor },
  });
  const confirmationsFormatted = new Intl.NumberFormat(RNLocalize.getLocales()[0].languageCode, { maximumSignificantDigits: 3 }).format(
    confirmations,
  );

  return (
    <RNElementsListItem bottomDivider containerStyle={oStyles.container}>
      <Avatar rounded overlayContainerStyle={oStyles.avatar} />
      <RNElementsListItem.Content>
        <RNElementsListItem.Title numberOfLines={1} adjustsFontSizeToFit style={oStyles.amount}>
          {amount}
          <View style={oStyles.tranContainer}>
            <Text style={oStyles.tranText}>{loc.formatString(loc.transactions.list_conf, { number: confirmationsFormatted })}</Text>
          </View>
        </RNElementsListItem.Title>
        {memo ? (
          <>
            <RNElementsListItem.Subtitle style={oStyles.memo}>{memo}</RNElementsListItem.Subtitle>
            <BlueSpacing10 />
          </>
        ) : null}
        <RNElementsListItem.Subtitle style={oStyles.memo}>{address}</RNElementsListItem.Subtitle>
        <BlueSpacing10 />
        <RNElementsListItem.Subtitle style={oStyles.memo}>{fullId}</RNElementsListItem.Subtitle>
      </RNElementsListItem.Content>
    </RNElementsListItem>
  );
};

OutputModal.propTypes = {
  item: PropTypes.shape({
    address: PropTypes.string.isRequired,
    txid: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    vout: PropTypes.number.isRequired,
    confirmations: PropTypes.number,
  }),
  balanceUnit: PropTypes.string,
  oMemo: PropTypes.string,
};

const mStyles = StyleSheet.create({
  memoTextInput: {
    flexDirection: 'row',
    borderWidth: 1,
    borderBottomWidth: 0.5,
    minHeight: 44,
    height: 44,
    alignItems: 'center',
    marginVertical: 8,
    borderRadius: 4,
    paddingHorizontal: 8,
    color: '#81868e',
  },
  buttonContainer: {
    height: 45,
    marginBottom: 36,
    marginHorizontal: 24,
  },
});

const transparentBackground = { backgroundColor: 'transparent' };
const OutputModalContent = ({ output, wallet, onUseCoin, frozen, setFrozen }) => {
  const { colors } = useTheme();
  const { txMetadata, saveToDisk } = useStorage();
  const [memo, setMemo] = useState(wallet.getUTXOMetadata(output.txid, output.vout).memo || txMetadata[output.txid]?.memo || '');
  const onMemoChange = value => setMemo(value);
  const switchValue = useMemo(() => ({ value: frozen, onValueChange: value => setFrozen(value) }), [frozen, setFrozen]);

  // save on form change. Because effect called on each event, debounce it.
  const debouncedSaveMemo = useRef(
    debounce(async m => {
      wallet.setUTXOMetadata(output.txid, output.vout, { memo: m });
      await saveToDisk();
    }, 500),
  );
  useEffect(() => {
    debouncedSaveMemo.current(memo);
  }, [memo]);

  return (
    <View style={styles.padding}>
      <OutputModal item={output} balanceUnit={wallet.getPreferredBalanceUnit()} />
      <BlueSpacing20 />
      <TextInput
        testID="OutputMemo"
        placeholder={loc.send.details_note_placeholder}
        value={memo}
        placeholderTextColor="#81868e"
        style={[
          mStyles.memoTextInput,
          {
            borderColor: colors.formBorder,
            borderBottomColor: colors.formBorder,
            backgroundColor: colors.inputBackgroundColor,
          },
        ]}
        onChangeText={onMemoChange}
      />
      <ListItem
        title={loc.cc.freezeLabel}
        containerStyle={transparentBackground}
        Component={TouchableWithoutFeedback}
        switch={switchValue}
      />
      <BlueSpacing20 />
    </View>
  );
};

OutputModalContent.propTypes = {
  output: PropTypes.object,
  wallet: PropTypes.object,
  onUseCoin: PropTypes.func.isRequired,
  frozen: PropTypes.bool.isRequired,
  setFrozen: PropTypes.func.isRequired,
};

const CoinControl = () => {
  const { colors } = useTheme();
  const navigation = useExtendedNavigation();
  const { width } = useWindowDimensions();
  const bottomModalRef = useRef(null);
  const { walletID, onUTXOChoose } = useRoute().params;
  const { wallets, saveToDisk, sleep } = useStorage();
  const wallet = wallets.find(w => w.getID() === walletID);
  // sort by height ascending, txid , vout ascending
  const utxo = wallet.getUtxo(true).sort((a, b) => a.height - b.height || a.txid.localeCompare(b.txid) || a.vout - b.vout);
  const [output, setOutput] = useState();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [frozen, setFrozen] = useState(
    utxo.filter(out => wallet.getUTXOMetadata(out.txid, out.vout).frozen).map(({ txid, vout }) => `${txid}:${vout}`),
  );

  // save frozen status. Because effect called on each event, debounce it.
  const debouncedSaveFronen = useRef(
    debounce(async frzn => {
      utxo.forEach(({ txid, vout }) => {
        wallet.setUTXOMetadata(txid, vout, { frozen: frzn.includes(`${txid}:${vout}`) });
      });
      await saveToDisk();
    }, 500),
  );
  useEffect(() => {
    debouncedSaveFronen.current(frozen);
  }, [frozen]);

  useEffect(() => {
    (async () => {
      try {
        await Promise.race([wallet.fetchUtxo(), sleep(10000)]);
      } catch (e) {
        console.log('coincontrol wallet.fetchUtxo() failed'); // either sleep expired or fetchUtxo threw an exception
      }
      const freshUtxo = wallet.getUtxo(true);
      setFrozen(freshUtxo.filter(out => wallet.getUTXOMetadata(out.txid, out.vout).frozen).map(({ txid, vout }) => `${txid}:${vout}`));
      setLoading(false);
    })();
  }, [wallet, setLoading, sleep]);

  const stylesHook = StyleSheet.create({
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
  });

  const tipCoins = () => {
    if (utxo.length === 0) return null;

    let text = loc.cc.tip;
    if (selected.length > 0) {
      // show summ of coins if any selected
      const summ = selected.reduce((prev, curr) => {
        return prev + utxo.find(({ txid, vout }) => `${txid}:${vout}` === curr).value;
      }, 0);

      const value = formatBalance(summ, wallet.getPreferredBalanceUnit(), true);
      text = loc.formatString(loc.cc.selected_summ, { value });
    }

    return (
      <View style={[styles.tip, stylesHook.tip]}>
        <Text style={{ color: colors.foregroundColor }}>{text}</Text>
      </View>
    );
  };

  const handleChoose = item => setOutput(item);

  const handleUseCoin = async u => {
    await bottomModalRef.current?.dismiss();
    setOutput(null);
    navigation.pop();
    onUTXOChoose(u);
  };

  const handleMassFreeze = () => {
    if (allFrozen) {
      setFrozen(f => f.filter(i => !selected.includes(i))); // unfreeze
    } else {
      setFrozen(f => [...new Set([...f, ...selected])]); // freeze
    }
  };

  const handleMassUse = () => {
    const fUtxo = utxo.filter(({ txid, vout }) => selected.includes(`${txid}:${vout}`));
    handleUseCoin(fUtxo);
  };

  // check if any outputs are selected
  const selectionStarted = selected.length > 0;
  // check if all selected items are frozen
  const allFrozen = selectionStarted && selected.reduce((prev, curr) => (prev ? frozen.includes(curr) : false), true);
  const buttonFontSize = PixelRatio.roundToNearestPixel(width / 26) > 22 ? 22 : PixelRatio.roundToNearestPixel(width / 26);

  const renderItem = p => {
    const { memo } = wallet.getUTXOMetadata(p.item.txid, p.item.vout);
    const change = wallet.addressIsChange(p.item.address);
    const oFrozen = frozen.includes(`${p.item.txid}:${p.item.vout}`);
    return (
      <OutputList
        balanceUnit={wallet.getPreferredBalanceUnit()}
        item={p.item}
        oMemo={memo}
        frozen={oFrozen}
        change={change}
        onOpen={() => handleChoose(p.item)}
        selected={selected.includes(`${p.item.txid}:${p.item.vout}`)}
        selectionStarted={selectionStarted}
        onSelect={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // animate buttons show
          setSelected(s => [...s, `${p.item.txid}:${p.item.vout}`]);
        }}
        onDeSelect={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // animate buttons show
          setSelected(s => s.filter(i => i !== `${p.item.txid}:${p.item.vout}`));
        }}
      />
    );
  };

  const renderOutputModalContent = () => {
    const oFrozen = frozen.includes(`${output.txid}:${output.vout}`);
    const setOFrozen = value => {
      if (value) {
        setFrozen(f => [...f, `${output.txid}:${output.vout}`]);
      } else {
        setFrozen(f => f.filter(i => i !== `${output.txid}:${output.vout}`));
      }
    };
    return <OutputModalContent output={output} wallet={wallet} onUseCoin={handleUseCoin} frozen={oFrozen} setFrozen={setOFrozen} />;
  };

  useEffect(() => {
    if (output) {
      bottomModalRef.current?.present();
    }
  }, [output]);

  if (loading) {
    return (
      <SafeArea style={[styles.center, { backgroundColor: colors.elevated }]}>
        <ActivityIndicator testID="Loading" />
      </SafeArea>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.elevated }]}>
      {utxo.length === 0 && (
        <View style={styles.empty}>
          <Text style={{ color: colors.foregroundColor }}>{loc.cc.empty}</Text>
        </View>
      )}

      <BottomModal
        ref={bottomModalRef}
        onClose={() => {
          Keyboard.dismiss();
          setOutput(false);
        }}
        backgroundColor={colors.elevated}
        footer={
          <View style={mStyles.buttonContainer}>
            <Button testID="UseCoin" title={loc.cc.use_coin} onPress={() => handleUseCoin([output])} />
          </View>
        }
        contentContainerStyle={styles.modalMinHeight}
      >
        {output && renderOutputModalContent()}
      </BottomModal>
      <FlatList
        ListHeaderComponent={tipCoins}
        data={utxo}
        renderItem={renderItem}
        keyExtractor={item => `${item.txid}:${item.vout}`}
        contentInset={{ top: 0, left: 0, bottom: 70, right: 0 }}
      />

      {selectionStarted && (
        <FContainer>
          <FButton
            onPress={handleMassFreeze}
            text={allFrozen ? loc.cc.freezeLabel_un : loc.cc.freezeLabel}
            icon={<Icon name="snowflake" size={buttonFontSize} type="font-awesome-5" color={colors.buttonAlternativeTextColor} />}
          />
          <FButton
            onPress={handleMassUse}
            text={selected.length > 1 ? loc.cc.use_coins : loc.cc.use_coin}
            icon={
              <View style={styles.sendIcon}>
                <Icon name="arrow-down" size={buttonFontSize} type="font-awesome" color={colors.buttonAlternativeTextColor} />
              </View>
            }
          />
        </FContainer>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  padding: {
    padding: 16,
  },
  modalMinHeight: Platform.OS === 'android' ? { minHeight: 420 } : {},
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  tip: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginVertical: 24,
  },
  sendIcon: {
    transform: [{ rotate: '225deg' }],
  },
});

export default CoinControl;
