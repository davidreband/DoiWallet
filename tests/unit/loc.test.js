import assert from 'assert';

import { _setExchangeRate, _setPreferredFiatCurrency, _setSkipUpdateExchangeRate } from '../../blue_modules/currency';
import loc, {
  _leaveNumbersAndDots,
  formatBalance,
  formatBalancePlain,
  formatBalanceWithoutSuffix,
  parsedLanguages,
  saveLanguage,
} from '../../loc';
import enJson from '../../loc/en.json';
import ruJson from '../../loc/ru.json';
import { DoichainUnit } from '../../models/doichainUnits';
import { FiatUnit } from '../../models/fiatUnit';

describe('Localization', () => {
  it('switches active language and round-trips back to en', async () => {
    await saveLanguage('en');
    const enValue = enJson._.never;
    assert.strictEqual(loc._.never, enValue, 'starts on en');

    await saveLanguage('ru');
    assert.strictEqual(loc.getLanguage(), 'ru', 'active language is ru');
    assert.strictEqual(loc._.never, ruJson._.never, 'ru strings applied');
    assert.notStrictEqual(loc._.never, enValue, 'ru differs from en');

    await saveLanguage('en');
    assert.strictEqual(loc.getLanguage(), 'en', 'active language back to en');
    assert.strictEqual(loc._.never, enValue, 'en strings restored');
  });

  it('caches parsed language dictionaries across toggles', async () => {
    // fr_fr is untouched by other tests so we observe the first cache fill, not a residue.
    await saveLanguage('fr_fr');
    assert.ok('fr_fr' in parsedLanguages, 'fr_fr cached after first switch');
    const cached = parsedLanguages.fr_fr;

    await saveLanguage('en');
    await saveLanguage('fr_fr');
    assert.strictEqual(parsedLanguages.fr_fr, cached, 'cached dict reused, not re-required');
  });

  it('internal formatter', () => {
    assert.strictEqual(_leaveNumbersAndDots('1,00 ₽'), '1');
    assert.strictEqual(_leaveNumbersAndDots('0,50 ₽"'), '0.50');
    assert.strictEqual(_leaveNumbersAndDots('RUB 1,00'), '1');
  });

  it('formatBalancePlain() && formatBalancePlain()', () => {
    _setExchangeRate('BTC_RUB', 660180.143);
    _setPreferredFiatCurrency(FiatUnit.RUB);
    let newInputValue = formatBalanceWithoutSuffix(152, DoichainUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 1.00' || newInputValue === '1,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(152, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1');

    newInputValue = formatBalanceWithoutSuffix(1515, DoichainUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 10.00' || newInputValue === '10,00 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(1515, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '10');

    newInputValue = formatBalanceWithoutSuffix(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.ok(newInputValue === 'RUB 110,869.52' || newInputValue === '110 869,52 ₽', 'Unexpected: ' + newInputValue);
    newInputValue = formatBalancePlain(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '110869.52');

    newInputValue = formatBalancePlain(76, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '0.50');

    _setExchangeRate('BTC_USD', 10000);
    _setPreferredFiatCurrency(FiatUnit.USD);
    newInputValue = formatBalanceWithoutSuffix(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '$1,679.38');
    newInputValue = formatBalancePlain(16793829, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1679.38');

    newInputValue = formatBalancePlain(16000000, DoichainUnit.LOCAL_CURRENCY, false);
    assert.strictEqual(newInputValue, '1600');
  });

  it.each([
    [123000000, DoichainUnit.SWARTZ, false, '123000000', false],
    // grouped by the machine's locale - 123,000,000 on CI, 123.000.000 on a German desktop
    [123000000, DoichainUnit.SWARTZ, true, new Intl.NumberFormat().format(123000000), false],
    [123456000, DoichainUnit.DOI, true, '1.23456', false], // can handle strings
    [100000000, DoichainUnit.DOI, true, '1', false],
    [10000000, DoichainUnit.DOI, true, '0.1', false],
    [1, DoichainUnit.DOI, true, '0.00000001', false],
    [10000000, DoichainUnit.LOCAL_CURRENCY, true, '...', true], // means unknown since we did not receive exchange rate
  ])(
    'can formatBalanceWithoutSuffix',
    async (balance, toUnit, withFormatting, expectedResult, shouldResetRate) => {
      _setExchangeRate('BTC_USD', 1);
      _setPreferredFiatCurrency(FiatUnit.USD);
      if (shouldResetRate) {
        _setExchangeRate('BTC_USD', false);
        _setSkipUpdateExchangeRate();
      }
      const actualResult = formatBalanceWithoutSuffix(balance, toUnit, withFormatting);

      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );

  it.each([
    [123000000, DoichainUnit.SWARTZ, false, '123000000 swartz'],
    [123000000, DoichainUnit.DOI, false, '1.23 DOI'],
    [15, DoichainUnit.DOI, false, '0.00000015 DOI'],
    [1, DoichainUnit.DOI, false, '0.00000001 DOI'],
    [0, DoichainUnit.DOI, false, '0 DOI'],
    [123000000, DoichainUnit.LOCAL_CURRENCY, false, '$1.23'],
  ])(
    'can formatBalance',
    async (balance, toUnit, withFormatting, expectedResult) => {
      _setExchangeRate('BTC_USD', 1);
      _setPreferredFiatCurrency(FiatUnit.USD);
      const actualResult = formatBalance(balance, toUnit, withFormatting);
      assert.strictEqual(actualResult, expectedResult);
    },
    240000,
  );
});
