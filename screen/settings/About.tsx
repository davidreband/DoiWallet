import React from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { Alert, Image, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync,useFirstInstallTime } from 'react-native-device-info';
import { Icon } from '@rneui/themed';
import Rate, { AndroidMarket } from 'react-native-rate';
import A from '../../blue_modules/analytics';
import { BlueCard, BlueSpacing20, BlueTextCentered } from '../../BlueComponents';
import { HDSegwitBech32Wallet } from '../../class';
import presentAlert from '../../components/Alert';
import Button from '../../components/Button';
import ListItem from '../../components/ListItem';
import { useTheme } from '../../components/themes';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import { useSettings } from '../../hooks/context/useSettings';

const branch = require('../../current-branch.json');

const About: React.FC = () => {
  const { navigate } = useExtendedNavigation();
  const { colors } = useTheme();
  const { width, height } = useWindowDimensions();
  const { isElectrumDisabled } = useSettings();

  const stylesHook = StyleSheet.create({
    textBackup: {
      color: colors.foregroundColor,
    },
    buildWith: {
      backgroundColor: colors.inputBackgroundColor,
    },
    buttonLink: {
      backgroundColor: colors.lightButton,
    },
    textLink: {
      color: colors.foregroundColor,
    },
  });

  const handleOnReleaseNotesPress = () => {
    navigate('ReleaseNotes');
  };

  const handleOnSelfTestPress = () => {
    if (isElectrumDisabled) {
      presentAlert({ message: loc.settings.about_selftest_electrum_disabled });
    } else {
      navigate('SelfTest');
    }
  };

  const handleOnLicensingPress = () => {
    navigate('Licensing');
  };

  const handleOnTwitterPress = () => {
    Linking.openURL('https://twitter.com/bluewalletio');
  };

  const handleOnDiscordPress = () => {
    Linking.openURL('https://discord.gg/btWq2Aby2z');
  };

  const handleOnTelegramPress = () => {
    Linking.openURL('https://t.me/bluewallethat');
  };

  const handleOnGithubPress = () => {
    Linking.openURL("https://github.com/Doichain/DoiWallet");
  };

  const handleOnRatePress = () => {
    const options = {
      AppleAppID: "1376878040",
      GooglePackageName: "org.doichain.doiwallet",
      preferredAndroidMarket: AndroidMarket.Google,
      preferInApp: Platform.OS !== "android",
      openAppStoreIfInAppFails: true,
      fallbackPlatformURL: "https://www.doichain.org",
    };
    Rate.rate(options, success => {
      if (success) {
        console.log('User Rated.');
      }
    });
  };
  const firstInstallTime = useFirstInstallTime().result; 

  return (
    <ScrollView testID="AboutScrollView" contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets>
      <BlueCard>
        <View style={styles.center}>
          <Image style={styles.logo} source={require('../../img/bluebeast.png')} />
          <Text style={styles.textFree}>{loc.settings.about_free}</Text>
          <Text style={[styles.textBackup, stylesHook.textBackup]}>{formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}</Text>
          {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
            <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
          )}
        </View>
      </BlueCard>
      <BlueCard>
        <View style={[styles.buildWith, stylesHook.buildWith]}>
          <BlueSpacing20 />
          <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
          <BlueSpacing20 />
          <BlueTextCentered>React Native</BlueTextCentered>
          <BlueTextCentered>@doichain/doichainjs-lib</BlueTextCentered>
          <BlueTextCentered>Nodejs</BlueTextCentered>
          <BlueTextCentered>Electrum server</BlueTextCentered>
          <BlueSpacing20 />
          <TouchableOpacity accessibilityRole="button" onPress={handleOnGithubPress} style={[styles.buttonLink, stylesHook.buttonLink]}>
            <Icon size={22} name="github" type="font-awesome-5" color={colors.foregroundColor} />
            <Text style={[styles.textLink, stylesHook.textLink]}>{formatStringAddTwoWhiteSpaces(loc.settings.about_sm_github)}</Text>
          </TouchableOpacity>
        </View>
      </BlueCard>
      <ListItem
        leftIcon={{
          name: 'book',
          type: 'font-awesome',
          color: '#9AA0AA',
        }}
        chevron
        onPress={handleOnReleaseNotesPress}
        title={loc.settings.about_release_notes}
      />
      <ListItem
        leftIcon={{
          name: 'balance-scale',
          type: 'font-awesome',
          color: colors.foregroundColor,
        }}
        chevron
        onPress={handleOnLicensingPress}
        title={loc.settings.about_license}
      />
     
      <BlueSpacing20 />
      <BlueSpacing20 />
      <BlueTextCentered>
        {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
      </BlueTextCentered>
      <BlueTextCentered>{new Date(firstInstallTime).toString()   }</BlueTextCentered>
      <BlueTextCentered>{getBundleId()}</BlueTextCentered>
      <BlueTextCentered>
        w, h = {width}, {height}
      </BlueTextCentered>
      {process.env.NODE_ENV !== 'development' && (
        <>
          <BlueTextCentered>Unique ID: {getUniqueIdSync()}</BlueTextCentered>
          <View style={styles.copyToClipboard}>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                const stringToCopy = 'userId:' + getUniqueIdSync();
                A.logError('copied unique id');
                Clipboard.setString(stringToCopy);
              }}
            >
              <Text style={styles.copyToClipboardText}>{loc.transactions.details_copy}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
      <BlueSpacing20 />
      <BlueSpacing20 />
    </ScrollView>
  );
};

export default About;

const styles = StyleSheet.create({
  copyToClipboard: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyToClipboardText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#68bbe1',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 54,
  },
  logo: {
    width: 102,
    height: 124,
  },
  textFree: {
    maxWidth: 260,
    marginVertical: 24,
    color: '#9AA0AA',
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  textBackup: {
    maxWidth: 260,
    marginBottom: 40,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
  buildWith: {
    padding: 16,
    paddingTop: 0,
    borderRadius: 8,
  },
  buttonLink: {
    borderRadius: 12,
    justifyContent: 'center',
    padding: 8,
    flexDirection: 'row',
  },
  textLink: {
    marginLeft: 8,
    fontWeight: '600',
  },
});
