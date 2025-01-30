import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { Image, LayoutAnimation, Pressable, StyleSheet, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Badge, Icon, Text } from '@rneui/themed';

import {
  fiatToBTC,
  getCurrencySymbol,
  isRateOutdated,
  mostRecentFetchedRate,
  satoshiToBTC,
  updateExchangeRate,
} from '../blue_modules/currency';
import { BlueText } from '../BlueComponents';
import confirm from '../helpers/confirm';
import loc, { formatBalancePlain, formatBalanceWithoutSuffix, removeTrailingZeros } from '../loc';
import { DoichainUnit} from '../models/doichainUnits';
import { useTheme } from './themes';

dayjs.extend(localizedFormat);

class AmountInput extends Component {
  static propTypes = {
    isLoading: PropTypes.bool,
    /**
     * amount is a sting thats always in current unit denomination, e.g. '0.001' or '9.43' or '10000'
     */
    amount: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    /**
     * callback that returns currently typed amount, in current denomination, e.g. 0.001 or 10000 or $9.34
     * (btc, sat, fiat)
     */
    onChangeText: PropTypes.func.isRequired,
    /**
     * callback thats fired to notify of currently selected denomination, returns <BitcoinUnit.*>
     */
    onAmountUnitChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    colors: PropTypes.object.isRequired,
    pointerEvents: PropTypes.string,
    unit: PropTypes.string,
    onBlur: PropTypes.func,
    onFocus: PropTypes.func,
  };

  /**
   * cache of conversions  fiat amount => satoshi
   * @type {{}}
   */
  static conversionCache = {};

  static getCachedSatoshis = amount => {
    return AmountInput.conversionCache[amount + DoichainUnit.LOCAL_CURRENCY] || false;
  };

  static setCachedSatoshis = (amount, sats) => {
    AmountInput.conversionCache[amount + DoichainUnit.LOCAL_CURRENCY] = sats;
  };

  constructor() {
    super();
    this.state = { mostRecentFetchedRate: Date(), isRateOutdated: false, isRateBeingUpdated: false };
  }

  componentDidMount() {
    mostRecentFetchedRate()
      .then(mostRecentFetchedRateValue => {
        this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
      })
      .finally(() => {
        isRateOutdated().then(isRateOutdatedValue => this.setState({ isRateOutdated: isRateOutdatedValue }));
      });
  }

  /**
   * here we must recalculate old amont value (which was denominated in `previousUnit`) to new denomination `newUnit`
   * and fill this value in input box, so user can switch between, for example, 0.001 BTC <=> 100000 sats
   *
   * @param previousUnit {string} one of {BitcoinUnit.*}
   * @param newUnit {string} one of {BitcoinUnit.*}
   */
  onAmountUnitChange(previousUnit, newUnit) {
    const amount = this.props.amount || 0;
    const log = `${amount}(${previousUnit}) ->`;
    let sats = 0;
    switch (previousUnit) {
      case DoichainUnit.DOI:
        sats = new BigNumber(amount).multipliedBy(100000000).toString();
        break;
      case DoichainUnit.SWARTZ:
        sats = amount;
        break;
      case DoichainUnit.LOCAL_CURRENCY:
        sats = new BigNumber(fiatToBTC(amount))
          .multipliedBy(100000000)
          .toString();
        break;
    }
    if (previousUnit === DoichainUnit.LOCAL_CURRENCY && AmountInput.conversionCache[amount + previousUnit]) {
      // cache hit! we reuse old value that supposedly doesnt have rounding errors
      sats = AmountInput.conversionCache[amount + previousUnit];
    }

    const newInputValue = formatBalancePlain(sats, newUnit, false);
    console.log(`${log} ${sats}(sats) -> ${newInputValue}(${newUnit})`);

    if (newUnit === DoichainUnit.LOCAL_CURRENCY && previousUnit === DoichainUnit.SWARTZ) {
      // we cache conversion, so when we will need reverse conversion there wont be a rounding error
      AmountInput.conversionCache[newInputValue + newUnit] = amount;
    }
    this.props.onChangeText(newInputValue);
    this.props.onAmountUnitChange(newUnit);
  }

  /**
   * responsible for cycling currently selected denomination, BTC->SAT->LOCAL_CURRENCY->BTC
   */
  changeAmountUnit = () => {
    let previousUnit = this.props.unit;
    let newUnit;
    if (previousUnit === DoichainUnit.DOI) {
      newUnit = DoichainUnit.SWARTZ;
    } else if (previousUnit === DoichainUnit.SWARTZ) {
      newUnit = DoichainUnit.LOCAL_CURRENCY;
    } else if (previousUnit === DoichainUnit.LOCAL_CURRENCY) {
      newUnit = DoichainUnit.DOI;
    } else {
      newUnit = DoichainUnit.DOI;
      previousUnit = DoichainUnit.SWARTZ;
    }
    this.onAmountUnitChange(previousUnit, newUnit);
  };

  maxLength = () => {
    switch (this.props.unit) {
      case DoichainUnit.DOI:
        return 11;
      case DoichainUnit.SWARTZ:
        return 15;
      default:
        return 15;
    }
  };

  textInput = React.createRef();

  handleTextInputOnPress = () => {
    this.textInput.current.focus();
  };

  handleChangeText = text => {
    text = text.trim();
    if (this.props.unit !== DoichainUnit.LOCAL_CURRENCY) {
      text = text.replace(",", ".");
      const split = text.split(".");
      if (split.length >= 2) {
        text = `${parseInt(split[0], 10)}.${split[1]}`;
      } else {
        text = `${parseInt(split[0], 10)}`;
      }

      text =
        this.props.unit === DoichainUnit.DOI
          ? text.replace(/[^0-9.]/g, "")
          : text.replace(/[^0-9]/g, "");

      if (text.startsWith(".")) {
        text = "0.";
      }
    } else if (this.props.unit === DoichainUnit.LOCAL_CURRENCY) {
      text = text.replace(/,/gi, ".");
      if (text.split(".").length > 2) {
        // too many dots. stupid code to remove all but first dot:
        let rez = "";
        let first = true;
        for (const part of text.split(".")) {
          rez += part;
          if (first) {
            rez += ".";
            first = false;
          }
        }
        text = rez;
      }
      if (text.startsWith("0") && !(text.includes(".") || text.includes(","))) {
        text = text.replace(/^(0+)/g, "");
      }
      text = text.replace(/[^\d.,-]/g, ""); // remove all but numbers, dots & commas
      text = text.replace(/(\..*)\./g, "$1");
    }
    this.props.onChangeText(text);
  };

  resetAmount = async () => {
    if (await confirm(loc.send.reset_amount, loc.send.reset_amount_confirm)) {
      this.props.onChangeText();
    }
  };

  updateRate = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    this.setState({ isRateBeingUpdated: true }, async () => {
      try {
        await updateExchangeRate();
        mostRecentFetchedRate().then(mostRecentFetchedRateValue => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          this.setState({ mostRecentFetchedRate: mostRecentFetchedRateValue });
        });
      } finally {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        this.setState({ isRateBeingUpdated: false, isRateOutdated: await isRateOutdated() });
      }
    });
  };

  render() {
    const { colors, disabled, unit } = this.props;
    const amount = this.props.amount || 0;
    let secondaryDisplayCurrency = formatBalanceWithoutSuffix(amount, DoichainUnit.LOCAL_CURRENCY, false);

    // if main display is sat or btc - secondary display is fiat
    // if main display is fiat - secondary dislay is btc
    let sat;
    switch (unit) {
      case DoichainUnit.DOI:
        sat = new BigNumber(amount).multipliedBy(100000000).toString();
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(
          sat,
          DoichainUnit.LOCAL_CURRENCY,
          false
        );
        break;
      case DoichainUnit.SWARTZ:
        secondaryDisplayCurrency = formatBalanceWithoutSuffix(
          (isNaN(amount) ? 0 : amount).toString(),
          DoichainUnit.LOCAL_CURRENCY,
          false
        );
        break;
      case DoichainUnit.LOCAL_CURRENCY:
        secondaryDisplayCurrency = fiatToBTC(
          parseFloat(isNaN(amount) ? 0 : amount)
        );
        if (
          AmountInput.conversionCache[
            isNaN(amount) ? 0 : amount + DoichainUnit.LOCAL_CURRENCY
          ]
        ) {
          // cache hit! we reuse old value that supposedly doesn't have rounding errors
          const sats =
            AmountInput.conversionCache[
              isNaN(amount) ? 0 : amount + DoichainUnit.LOCAL_CURRENCY
            ];
          secondaryDisplayCurrency = satoshiToBTC(sats);
        }
        break;
    }

    if (amount === DoichainUnit.MAX) secondaryDisplayCurrency = ""; // we don't want to display NaN

    const stylesHook = StyleSheet.create({
      center: { padding: amount === DoichainUnit.MAX ? 0 : 15 },
      localCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
      input: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2, fontSize: amount.length > 10 ? 20 : 36 },
      cryptoCurrency: { color: disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2 },
    });

    return (
      <TouchableWithoutFeedback
        accessibilityRole="button"
        accessibilityLabel={loc._.enter_amount}
        disabled={this.props.pointerEvents === 'none'}
        onPress={() => this.textInput.focus()}
      >
        <>
          <View style={styles.root}>
            {!disabled && <View style={[styles.center, stylesHook.center]} />}
            <View style={styles.flex}>
              <View style={styles.container}>
                {unit === DoichainUnit.LOCAL_CURRENCY && amount !== DoichainUnit.MAX && (
                  <Text style={[styles.localCurrency, stylesHook.localCurrency]}>{getCurrencySymbol() + ' '}</Text>
                )}
                {amount !== DoichainUnit.MAX ? (
                  <TextInput
                    {...this.props}
                    caretHidden
                    testID="BitcoinAmountInput"
                    keyboardType="numeric"
                    adjustsFontSizeToFit
                    onChangeText={this.handleChangeText}
                    onBlur={() => {
                      if (this.props.onBlur) this.props.onBlur();
                    }}
                    onFocus={() => {
                      if (this.props.onFocus) this.props.onFocus();
                    }}
                    placeholder="0"
                    maxLength={this.maxLength()}
                    ref={textInput => (this.textInput = textInput)}
                    editable={!this.props.isLoading && !disabled}
                    value={amount === DoichainUnit.MAX ? loc.units.MAX : parseFloat(amount) >= 0 ? String(amount) : undefined}
                    placeholderTextColor={disabled ? colors.buttonDisabledTextColor : colors.alternativeTextColor2}
                    style={[styles.input, stylesHook.input]}
                  />
                ) : (
                  <Pressable onPress={this.resetAmount}>
                    <Text style={[styles.input, stylesHook.input]}>{DoichainUnit.MAX}</Text>
                  </Pressable>
                )}
                {unit !== DoichainUnit.LOCAL_CURRENCY && amount !== DoichainUnit.MAX && (
                  <Text style={[styles.cryptoCurrency, stylesHook.cryptoCurrency]}>{' ' + loc.units[unit]}</Text>
                )}
              </View>
              <View style={styles.secondaryRoot}>
                <Text style={styles.secondaryText}>
                  {unit === DoichainUnit.LOCAL_CURRENCY && amount !== DoichainUnit.MAX
                    ? removeTrailingZeros(secondaryDisplayCurrency)
                    : secondaryDisplayCurrency}
                  {unit === DoichainUnit.LOCAL_CURRENCY && amount !== DoichainUnit.MAX ? ` ${loc.units[DoichainUnit.DOI]}` : null}
                </Text>
              </View>
            </View>
            {!disabled && amount !== DoichainUnit.MAX && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={loc._.change_input_currency}
                testID="changeAmountUnitButton"
                style={styles.changeAmountUnit}
                onPress={this.changeAmountUnit}
              >
                <Image source={require('../img/round-compare-arrows-24-px.png')} />
              </TouchableOpacity>
            )}
          </View>
          {this.state.isRateOutdated && (
            <View style={styles.outdatedRateContainer}>
              <Badge status="warning" />
              <View style={styles.spacing8} />
              <BlueText>
                {loc.formatString(loc.send.outdated_rate, { date: dayjs(this.state.mostRecentFetchedRate.LastUpdated).format('l LT') })}
              </BlueText>
              <View style={styles.spacing8} />
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={loc._.refresh}
                onPress={this.updateRate}
                disabled={this.state.isRateBeingUpdated}
                style={this.state.isRateBeingUpdated ? styles.disabledButton : styles.enabledButon}
              >
                <Icon name="sync" type="font-awesome-5" size={16} color={colors.buttonAlternativeTextColor} />
              </TouchableOpacity>
            </View>
          )}
        </>
      </TouchableWithoutFeedback>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  center: {
    alignSelf: 'center',
  },
  flex: {
    flex: 1,
  },
  spacing8: {
    width: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  enabledButon: {
    opacity: 1,
  },
  outdatedRateContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  container: {
    flexDirection: 'row',
    alignContent: 'space-between',
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 2,
  },
  localCurrency: {
    fontSize: 18,
    marginHorizontal: 4,
    fontWeight: 'bold',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  input: {
    fontWeight: 'bold',
  },
  cryptoCurrency: {
    fontSize: 15,
    marginHorizontal: 4,
    fontWeight: '600',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  secondaryRoot: {
    alignItems: 'center',
    marginBottom: 22,
  },
  secondaryText: {
    fontSize: 16,
    color: '#9BA0A9',
    fontWeight: '600',
  },
  changeAmountUnit: {
    alignSelf: 'center',
    marginRight: 16,
    paddingLeft: 16,
    paddingVertical: 16,
  },
});

const AmountInputWithStyle = props => {
  const { colors } = useTheme();

  return <AmountInput {...props} colors={colors} />;
};

// expose static methods
AmountInputWithStyle.conversionCache = AmountInput.conversionCache;
AmountInputWithStyle.getCachedSatoshis = AmountInput.getCachedSatoshis;
AmountInputWithStyle.setCachedSatoshis = AmountInput.setCachedSatoshis;

export default AmountInputWithStyle;
