import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { Image, Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getApplicationName, getBuildNumber, getBundleId, getUniqueIdSync, getVersion, hasGmsSync } from 'react-native-device-info';
import Icon from 'react-native-vector-icons/FontAwesome5';

import A from '../../blue_modules/analytics';
import { BlueTextCentered } from '../../BlueComponents';
import presentAlert from '../../components/Alert';
import { BlueSpacing20 } from '../../components/BlueSpacing';
import Button from '../../components/Button';
import {
  SettingsCard,
  SettingsFlatList,
  SettingsListItem,
  SettingsListItemProps,
  SettingsSection,
  SettingsSectionHeader,
} from '../../components/platform';
import { useTheme } from '../../components/themes';
import { useSettings } from '../../hooks/context/useSettings';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc, { formatStringAddTwoWhiteSpaces } from '../../loc';

const branch = require('../../current-branch.json');
// written by the build - see scripts/build-time.sh and the gradle task that runs it
const buildTime = require('../../build-time.json');

interface AboutItem extends SettingsListItemProps {
  id: string;
  section?: number;
  customContent?: React.ReactNode;
}

const About: React.FC = () => {
  const { navigate } = useExtendedNavigation();
  const { isElectrumDisabled } = useSettings();
  const { colors } = useTheme();

  const handleOnReleaseNotesPress = useCallback(() => {
    navigate('ReleaseNotes');
  }, [navigate]);

  const handleOnSelfTestPress = useCallback(() => {
    if (isElectrumDisabled) {
      presentAlert({ message: loc.settings.about_selftest_electrum_disabled });
    } else {
      navigate('SelfTest');
    }
  }, [isElectrumDisabled, navigate]);

  const handleOnLicensingPress = useCallback(() => {
    navigate('Licensing');
  }, [navigate]);

  const handleOnGithubPress = useCallback(() => {
    Linking.openURL('https://github.com/Doichain/DoiWallet');
  }, []);

  const handleOnRatePress = useCallback(async () => {
    try {
      // the App Store ID upstream links to is BlueWallet's; until DoiWallet has its own listing there,
      // iOS goes to the Doichain site
      if (Platform.OS === 'ios') {
        await Linking.openURL('https://www.doichain.org');
      } else {
        await Linking.openURL('https://play.google.com/store/apps/details?id=org.doichain.doiwallet');
      }
    } catch (error: any) {
      console.error('Rate app failed:', error.message);
    }
  }, []);

  const aboutItems = useCallback((): AboutItem[] => {
    const items: AboutItem[] = [
      {
        id: 'header',
        title: '',
        customContent: (
          <SettingsSection compact>
            <SettingsCard style={[styles.card, styles.headerCard]}>
              <View style={styles.center}>
                <Image style={styles.logo} source={require('../../img/icon.png')} />
                <Text style={[styles.textFree, { color: colors.foregroundColor }]}>{loc.settings.about_free}</Text>
                <Text style={[styles.textBackup, { color: colors.alternativeTextColor }]}>
                  {formatStringAddTwoWhiteSpaces(loc.settings.about_backup)}
                </Text>
                {((Platform.OS === 'android' && hasGmsSync()) || Platform.OS !== 'android') && (
                  <View style={styles.headerButton}>
                    <Button onPress={handleOnRatePress} title={loc.settings.about_review + ' ⭐🙏'} />
                  </View>
                )}
              </View>
            </SettingsCard>
          </SettingsSection>
        ),
        section: 1,
      },
      {
        id: 'github',
        title: loc.settings.about_sm_github,
        leftIcon: <Icon name="github" size={24} color={colors.foregroundColor} />,
        onPress: handleOnGithubPress,
        section: 2,
      },
      {
        id: 'builtWith',
        title: '',
        customContent: (
          <SettingsSection compact>
            <SettingsCard style={[styles.card, styles.builtWithCard]}>
              <BlueTextCentered>{loc.settings.about_awesome} 👍</BlueTextCentered>
              <BlueSpacing20 />
              <BlueTextCentered>React Native</BlueTextCentered>
              <BlueTextCentered>@doichain/doichainjs-lib</BlueTextCentered>
              <BlueTextCentered>Electrum server</BlueTextCentered>
            </SettingsCard>
          </SettingsSection>
        ),
        section: 2.5,
      },
      {
        id: 'sectionSpacing1',
        title: '',
        customContent: <View style={styles.sectionSpacing} />,
        section: 2.9,
      },
      {
        id: 'releaseNotes',
        title: loc.settings.about_release_notes,
        iconName: 'releaseNotes',
        chevron: true,
        onPress: handleOnReleaseNotesPress,
        section: 3,
      },
      {
        id: 'licensing',
        title: loc.settings.about_license,
        iconName: 'licensing',
        chevron: true,
        onPress: handleOnLicensingPress,
        section: 3,
      },
      {
        id: 'selfTest',
        title: loc.settings.about_selftest,
        iconName: 'selfTest',
        chevron: true,
        onPress: handleOnSelfTestPress,
        testID: 'RunSelfTestButton',
        section: 3,
      },
      {
        id: 'footer',
        title: '',
        customContent: (
          <View style={styles.footerContainer}>
            <BlueSpacing20 />
            <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>
              {getApplicationName()} ver {getVersion()} (build {getBuildNumber() + ' ' + branch})
            </Text>
            <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>
              {new Date(buildTime).toString()}
            </Text>
            <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>{getBundleId()}</Text>
            <Text style={[styles.footerText, { color: colors.alternativeTextColor }]}>Unique ID: {getUniqueIdSync()}</Text>
            <View style={styles.copyToClipboard}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  const stringToCopy = 'userId:' + getUniqueIdSync();
                  A.logError('copied unique id');
                  Clipboard.setString(stringToCopy);
                }}
              >
                <Text style={[styles.copyToClipboardText, { color: colors.foregroundColor }]}>{loc.transactions.details_copy}</Text>
              </TouchableOpacity>
            </View>
            <BlueSpacing20 />
          </View>
        ),
        section: 4,
      },
    ];
    return items;
  }, [
    colors.foregroundColor,
    colors.alternativeTextColor,
    handleOnRatePress,
    handleOnGithubPress,
    handleOnReleaseNotesPress,
    handleOnLicensingPress,
    handleOnSelfTestPress,
  ]);

  const renderItem = useCallback(
    (props: { item: AboutItem }) => {
      const { id, section, customContent, ...listItemProps } = props.item;

      if (customContent) {
        return <>{customContent}</>;
      }

      if (listItemProps.title && !listItemProps.leftIcon && !listItemProps.onPress && section) {
        return <SettingsSectionHeader title={listItemProps.title} />;
      }

      const currentSection = Math.floor(section || 0);
      const sectionItems = aboutItems().filter(
        i => Math.floor(i.section || 0) === currentSection && !i.customContent && (i.onPress || i.leftIcon || i.chevron || i.subtitle),
      );
      const indexInSection = sectionItems.findIndex(i => i.id === id);
      const isFirstInSection = indexInSection === 0;
      const isLastInSection = indexInSection === sectionItems.length - 1;
      const position = isFirstInSection && isLastInSection ? 'single' : isFirstInSection ? 'first' : isLastInSection ? 'last' : 'middle';

      return <SettingsListItem {...listItemProps} position={position} />;
    },
    [aboutItems],
  );

  const keyExtractor = useCallback((item: AboutItem, index: number) => `${item.id}-${index}`, []);

  const ListFooterComponent = useCallback(() => <View style={styles.sectionSpacing} />, []);

  return (
    <SettingsFlatList
      data={aboutItems()}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      testID="AboutScrollView"
      ListFooterComponent={ListFooterComponent}
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustContentInsets
      removeClippedSubviews
    />
  );
};

export default About;

const styles = StyleSheet.create({
  sectionSpacing: {
    height: 16,
  },
  headerCard: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' && {
      borderRadius: 0,
      elevation: 0,
      marginHorizontal: 0,
      marginVertical: 0,
    }),
  },
  card: {
    marginVertical: 8,
  },
  builtWithCard: {
    paddingVertical: 16,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 12,
    resizeMode: 'contain',
  },
  textFree: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  textBackup: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  headerButton: {
    marginTop: 16,
  },
  footerContainer: {
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  copyToClipboard: {
    marginTop: 8,
    alignItems: 'center',
  },
  copyToClipboardText: {
    fontSize: 12,
  },
});
