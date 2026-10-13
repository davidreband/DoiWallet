import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Header } from '../../components/Header';
import SelfTest from '../../screen/settings/SelfTest';
import Settings from '../../screen/settings/Settings';
import { BlueDefaultTheme } from '../../components/themes';

jest.mock('../../blue_modules/BlueElectrum', () => {
  return {
    connectMain: jest.fn(),
  };
});

// the self test derives keys for every wallet type it knows, and AEZEED alone takes several
// seconds, so the 5 second default is not enough for it
jest.setTimeout(120 * 1000);

const Wrapper = ({ children }) => <NavigationContainer theme={BlueDefaultTheme}>{children}</NavigationContainer>;

it('Header works', () => {
  const { toJSON } = render(
    <Wrapper>
      <Header />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();
});

// eslint-disable-next-line jest/no-disabled-tests
it.skip('Settings work', () => {
  const { toJSON } = render(
    <Wrapper>
      <Settings />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();
});

it('SelfTest work', async () => {
  const { toJSON, findByTestId } = render(
    <Wrapper>
      <SelfTest />
    </Wrapper>,
  );
  expect(toJSON()).toBeTruthy();

  // The screen runs its checks in componentDidMount and shows a spinner until they finish, so
  // looking for the result the moment it renders only ever found the spinner. Waiting for it also
  // means a failing check is reported as what it says rather than as a missing "OK".
  await findByTestId('SelfTestOk', {}, { timeout: 60000 });
});
