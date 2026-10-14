import { createNativeStackNavigator, NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React, { lazy, Suspense } from 'react';
import UnlockWith from '../screen/UnlockWith';
import { LazyLoadingIndicator } from './LazyLoadingIndicator';
import { DetailViewStackParamList } from './DetailViewStackParamList';
import { useStorage } from '../hooks/context/useStorage';

// Lazy load all components except UnlockWith
const DrawerRoot = lazy(() => import('./DrawerRoot'));
const AddWalletStack = lazy(() => import('./AddWalletStack'));
const SendDetailsStack = lazy(() => import('./SendDetailsStack'));

const AztecoRedeemStackRoot = lazy(() => import('./AztecoRedeemStack'));
const WalletExportStack = lazy(() => import('./WalletExportStack'));
const ExportMultisigCoordinationSetupStack = lazy(() => import('./ExportMultisigCoordinationSetupStack'));
const WalletXpubStackRoot = lazy(() => import('./WalletXpubStack'));
const SignVerifyStackRoot = lazy(() => import('./SignVerifyStack'));
const ScanQRCode = lazy(() => import('../screen/send/ScanQRCode'));
const ViewEditMultisigCosignersStack = lazy(() => import('./ViewEditMultisigCosignersStack'));

export const NavigationDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
};
export const NavigationFormModalOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'formSheet',
};

export const NavigationFormNoSwipeDefaultOptions: NativeStackNavigationOptions = {
  headerShown: false,
  presentation: 'modal',
  headerShadowVisible: false,
  fullScreenGestureEnabled: false,
};
export const StatusBarLightOptions: NativeStackNavigationOptions = { statusBarStyle: 'light' };

const DetailViewStack = createNativeStackNavigator<DetailViewStackParamList>();

// Lazy loading wrapper components
const LazyDrawerRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <DrawerRoot />
  </Suspense>
);

const LazyAddWalletStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <AddWalletStack />
  </Suspense>
);

const LazySendDetailsStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SendDetailsStack />
  </Suspense>
);

const LazyAztecoRedeemStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <AztecoRedeemStackRoot />
  </Suspense>
);

const LazyWalletExportStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletExportStack />
  </Suspense>
);

const LazyExportMultisigCoordinationSetupStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ExportMultisigCoordinationSetupStack />
  </Suspense>
);

const LazyViewEditMultisigCosignersStack = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ViewEditMultisigCosignersStack />
  </Suspense>
);

const LazyWalletXpubStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <WalletXpubStackRoot />
  </Suspense>
);

const LazySignVerifyStackRoot = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <SignVerifyStackRoot />
  </Suspense>
);

const LazyScanQRCodeComponent = () => (
  <Suspense fallback={<LazyLoadingIndicator />}>
    <ScanQRCode />
  </Suspense>
);

const MainRoot = () => {
  const { walletsInitialized } = useStorage();

  return (
    <DetailViewStack.Navigator screenOptions={{ headerShown: false }}>
      {!walletsInitialized ? (
        <DetailViewStack.Screen name="UnlockWithScreen" component={UnlockWith} />
      ) : (
        <>
          <DetailViewStack.Screen name="DrawerRoot" component={LazyDrawerRoot} />

          {/* Modal stacks */}
          <DetailViewStack.Screen name="AddWalletRoot" component={LazyAddWalletStack} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen name="SendDetailsRoot" component={LazySendDetailsStack} options={NavigationFormNoSwipeDefaultOptions} />
          <DetailViewStack.Screen name="AztecoRedeemRoot" component={LazyAztecoRedeemStackRoot} options={NavigationDefaultOptions} />
          <DetailViewStack.Screen
            name="WalletExportRoot"
            component={LazyWalletExportStack}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen
            name="ExportMultisigCoordinationSetupRoot"
            component={LazyExportMultisigCoordinationSetupStack}
            options={NavigationDefaultOptions}
          />
          <DetailViewStack.Screen
            name="ViewEditMultisigCosignersRoot"
            component={LazyViewEditMultisigCosignersStack}
            // the stack draws its own header and title, so the outer screen must not add a second
            // one; gestureEnabled stays off, as it was, so a half-finished edit cannot be swiped
            // away
            options={{ ...NavigationDefaultOptions, gestureEnabled: false }}
          />
          <DetailViewStack.Screen
            name="WalletXpubRoot"
            component={LazyWalletXpubStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />
          <DetailViewStack.Screen
            name="SignVerifyRoot"
            component={LazySignVerifyStackRoot}
            options={{ ...NavigationDefaultOptions, ...StatusBarLightOptions }}
          />

          <DetailViewStack.Screen
            name="ScanQRCode"
            component={LazyScanQRCodeComponent}
            options={{
              headerShown: false,
              statusBarHidden: true,
              orientation: 'portrait',
              presentation: 'fullScreenModal',
            }}
          />
        </>
      )}
    </DetailViewStack.Navigator>
  );
};

export default MainRoot;
export { DetailViewStack };
