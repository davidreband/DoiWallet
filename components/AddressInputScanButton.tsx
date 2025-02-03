import React, { useCallback, useMemo } from 'react';
import { Image, Keyboard, Platform, StyleSheet, Text } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import ToolTipMenu from './TooltipMenu';
import loc from '../loc';
import { scanQrHelper } from '../helpers/scan-qr';
import { showFilePickerAndReadFile, showImagePickerAndReadImage } from '../blue_modules/fs';
import presentAlert from './Alert';
import { useTheme } from './themes';
import RNQRGenerator from 'rn-qr-generator';
import { CommonToolTipActions } from '../typings/CommonToolTipActions';
import { useSettings } from '../hooks/context/useSettings';

interface AddressInputScanButtonProps {
  isLoading: boolean;
  launchedBy?: string;
  scanButtonTapped: () => void;
  onBarScanned: (ret: { data?: any }) => void;
  onChangeText: (text: string) => void;
}

export const AddressInputScanButton = ({
  isLoading,
  launchedBy,
  scanButtonTapped,
  onBarScanned,
  onChangeText,
}: AddressInputScanButtonProps) => {
  const { colors } = useTheme();
  const { isClipboardGetContentEnabled } = useSettings();
  const stylesHook = StyleSheet.create({
    scan: {
      backgroundColor: colors.scanLabel,
    },
    scanText: {
      color: colors.inverseForegroundColor,
    },
  });

  const toolTipOnPress = useCallback(async () => {
    await scanButtonTapped();
    Keyboard.dismiss();
    if (launchedBy) scanQrHelper(launchedBy, true).then(value => onBarScanned({ data: value }));
  }, [launchedBy, onBarScanned, scanButtonTapped]);

  const actions = useMemo(() => {
    const availableActions = [
      CommonToolTipActions.ScanQR,
      CommonToolTipActions.ChoosePhoto,
      CommonToolTipActions.ImportFile,
      {
        ...CommonToolTipActions.PasteFromClipboard,
        hidden: !isClipboardGetContentEnabled,
      },
    ];

    return availableActions;
  }, [isClipboardGetContentEnabled]);

  const onMenuItemPressed = useCallback(
    async (action: string) => {
      if (onBarScanned === undefined) throw new Error('onBarScanned is required');
      switch (action) {
        case CommonToolTipActions.ScanQR.id:
          scanButtonTapped();
          if (launchedBy) {
            scanQrHelper(launchedBy)
              .then(value => onBarScanned({ data: value }))
              .catch(error => {
                presentAlert({ message: error.message });
              });
          }

          break;
        case CommonToolTipActions.PasteFromClipboard.id:
          try {
            let getImage: string | null = null;

            if (Platform.OS === 'android') {
              getImage = await Clipboard.getImage();
            } else {
              const hasImage = await Clipboard.hasImage();
              if (hasImage) {
                getImage = await Clipboard.getImageJPG();
              }
            }

            if (getImage) {
              try {
                const base64Data = getImage.replace(/^data:image\/jpeg;base64,/, '');

                const values = await RNQRGenerator.detect({
                  base64: base64Data,
                });

                if (values && values.values.length > 0) {
                  onChangeText(values.values[0]);
                } else {
                  presentAlert({ message: loc.send.qr_error_no_qrcode });
                }
              } catch (error) {
                presentAlert({ message: (error as Error).message });
              }
            } else {
              const clipboardText = await Clipboard.getString();
              onChangeText(clipboardText);
            }
          } catch (error) {
            presentAlert({ message: (error as Error).message });
          }
          break;
        case CommonToolTipActions.ChoosePhoto.id:
          showImagePickerAndReadImage()
            .then(value => {
              if (value) {
                onChangeText(value);
              }
            })
            .catch(error => {
              presentAlert({ message: error.message });
            });
          break;
        case CommonToolTipActions.ImportFile.id:
          showFilePickerAndReadFile()
            .then(value => {
              if (value.data) {
                onChangeText(value.data);
              }
            })
            .catch(error => {
              presentAlert({ message: error.message });
            });
          break;
      }
      Keyboard.dismiss();
    },
    [launchedBy, onBarScanned, onChangeText, scanButtonTapped],
  );

  const buttonStyle = useMemo(() => [styles.scan, stylesHook.scan], [stylesHook.scan]);

  return (
    <ToolTipMenu
      actions={actions}
      isButton
      onPressMenuItem={onMenuItemPressed}
      testID="BlueAddressInputScanQrButton"
      disabled={isLoading}
      onPress={toolTipOnPress}
      buttonStyle={buttonStyle}
      accessibilityLabel={loc.send.details_scan}
      accessibilityHint={loc.send.details_scan_hint}
    >
      <Image source={require('../img/scan-white.png')} accessible={false} />
      <Text style={[styles.scanText, stylesHook.scanText]} accessible={false}>
        {loc.send.details_scan}
      </Text>
    </ToolTipMenu>
  );
};

const styles = StyleSheet.create({
  scan: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  scanText: {
    marginLeft: 4,
  },
});

const actionKeys = {
  ScanQR: 'scan_qr',
  CopyFromClipboard: 'copy_from_clipboard',
  ChoosePhoto: 'choose_photo',
  ImportFile: 'import_file',
};

const actionIcons = {
  ScanQR: {
    iconValue: Platform.OS === 'ios' ? 'qrcode' : 'ic_menu_camera',
  },
  ImportFile: {
    iconValue: 'doc',
  },
  ChoosePhoto: {
    iconValue: Platform.OS === 'ios' ? 'photo' : 'ic_menu_gallery',
  },
  Clipboard: {
    iconValue: Platform.OS === 'ios' ? 'doc' : 'ic_menu_file',
  },
};

const actions = [
  {
    id: actionKeys.ScanQR,
    text: loc.wallets.list_long_scan,
    icon: actionIcons.ScanQR,
  },
  {
    id: actionKeys.CopyFromClipboard,
    text: loc.wallets.list_long_clipboard,
    icon: actionIcons.Clipboard,
  },
  {
    id: actionKeys.ChoosePhoto,
    text: loc.wallets.list_long_choose,
    icon: actionIcons.ChoosePhoto,
  },
  {
    id: actionKeys.ImportFile,
    text: loc.wallets.import_file,
    icon: actionIcons.ImportFile,
  },
];
