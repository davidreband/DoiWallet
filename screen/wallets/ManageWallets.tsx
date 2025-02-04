import React, { useEffect, useLayoutEffect, useReducer, useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, Text, Alert, I18nManager, Animated, LayoutAnimation } from 'react-native';
import {
  NestableScrollContainer,
  ScaleDecorator,
  OpacityDecorator,
  NestableDraggableFlatList,
  RenderItem,
  // @ts-expect-error: react-native-draggable-flatlist is not typed
} from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import triggerHapticFeedback, { HapticFeedbackTypes } from '../../blue_modules/hapticFeedback';
import { useTheme } from '../../components/themes';
import { WalletCarouselItem } from '../../components/WalletsCarousel';
import { TransactionListItem } from '../../components/TransactionListItem';
import { useExtendedNavigation } from '../../hooks/useExtendedNavigation';
import loc from '../../loc';
import { useStorage } from '../../hooks/context/useStorage';
import useDebounce from '../../hooks/useDebounce';
import { TTXMetadata } from '../../class';
import { ExtendedTransaction, LightningTransaction, Transaction, TWallet } from '../../class/wallets/types';
import { DoichainUnit} from '../../models/doichainUnits';
import useBounceAnimation from '../../hooks/useBounceAnimation';
import { unlockWithBiometrics, useBiometrics } from '../../hooks/useBiometrics';
import presentAlert from '../../components/Alert';
import prompt from '../../helpers/prompt';
import HeaderRightButton from '../../components/HeaderRightButton';
import { ManageWalletsListItem } from '../../components/ManageWalletsListItem';
import { useSettings } from '../../hooks/context/useSettings';
import { CommonToolTipActions } from '../../typings/CommonToolTipActions';
import MoreOptionsButton from '../../components/icons/MoreOptionsButton';
import { Action } from '../../components/types';

enum ItemType {
  WalletSection = 'wallet',
  TransactionSection = 'transaction',
}

enum SortOption {
  Balance = 'balance',
  Label = 'label',
  MostRecent = 'mostRecent',
  ASC = 'asc',
  DESC = 'desc',
}

interface WalletItem {
  type: ItemType.WalletSection;
  data: TWallet;
}

interface TransactionItem {
  type: ItemType.TransactionSection;
  data: ExtendedTransaction & LightningTransaction;
}

type Item = WalletItem | TransactionItem;

const SET_SEARCH_QUERY = 'SET_SEARCH_QUERY';
const SET_IS_SEARCH_FOCUSED = 'SET_IS_SEARCH_FOCUSED';
const SET_INITIAL_ORDER = 'SET_INITIAL_ORDER';
const SET_FILTERED_ORDER = 'SET_FILTERED_ORDER';
const SET_TEMP_ORDER = 'SET_TEMP_ORDER';
const REMOVE_WALLET = 'REMOVE_WALLET';
const SAVE_CHANGES = 'SAVE_CHANGES';
const SET_CURRENT_SORT = 'SET_CURRENT_SORT';

interface SaveChangesAction {
  type: typeof SAVE_CHANGES;
  payload: TWallet[];
}

interface SetSearchQueryAction {
  type: typeof SET_SEARCH_QUERY;
  payload: string;
}

interface SetIsSearchFocusedAction {
  type: typeof SET_IS_SEARCH_FOCUSED;
  payload: boolean;
}

interface SetWalletDataAction {
  type: typeof SET_WALLET_DATA;
  payload: TWallet[];
}

interface SetTxMetadataAction {
  type: typeof SET_TX_METADATA;
  payload: TTXMetadata;
}

interface SetOrderAction {
  type: typeof SET_ORDER;
  payload: Item[];
}

type Action = SetSearchQueryAction | SetIsSearchFocusedAction | SetWalletDataAction | SetTxMetadataAction | SetOrderAction;
interface RemoveWalletAction {
  type: typeof REMOVE_WALLET;
  payload: string; // Wallet ID
}

interface SetCurrentSortAction {
  type: typeof SET_CURRENT_SORT;
  payload: SortOption;
}

type ReducerAction =
  | SetSearchQueryAction
  | SetIsSearchFocusedAction
  | SetInitialOrderAction
  | SetFilteredOrderAction
  | SetTempOrderAction
  | SaveChangesAction
  | RemoveWalletAction
  | SetCurrentSortAction;

interface State {
  searchQuery: string;
  isSearchFocused: boolean;
  walletData: TWallet[];
  txMetadata: TTXMetadata;
  order: Item[];
  currentSort: SortOption;
}

const initialState: State = {
  searchQuery: '',
  isSearchFocused: false,
  walletData: [],
  txMetadata: {},
  order: [],
  currentSort: SortOption.Balance,
};

const deepCopyWallets = (wallets: TWallet[]): TWallet[] => {
  return wallets.map(wallet => Object.assign(Object.create(Object.getPrototypeOf(wallet)), wallet));
};

const reducer = (state: State, action: ReducerAction): State => {
  switch (action.type) {
    case SET_SEARCH_QUERY:
      return { ...state, searchQuery: action.payload };
    case SET_IS_SEARCH_FOCUSED:
      return { ...state, isSearchFocused: action.payload };
    case SET_INITIAL_ORDER: {
      const initialWalletsOrder: WalletItem[] = deepCopyWallets(action.payload.wallets).map(wallet => ({
        type: ItemType.WalletSection,
        data: wallet,
      }));
      return {
        ...state,
        wallets: action.payload.wallets,
        txMetadata: action.payload.txMetadata,
        order: initialWalletsOrder,
        tempOrder: initialWalletsOrder,
      };
    }
    case SET_FILTERED_ORDER: {
      const query = action.payload.toLowerCase();
      const filteredWallets = state.wallets
        .filter(wallet => wallet.getLabel()?.toLowerCase().includes(query))
        .map(wallet => ({ type: ItemType.WalletSection, data: wallet }));

      const filteredTxMetadata = Object.entries(state.txMetadata).filter(([_, tx]) => tx.memo?.toLowerCase().includes(query));

      const filteredTransactions = state.wallets.flatMap(wallet =>
        wallet
          .getTransactions()
          .filter((tx: Transaction) =>
            filteredTxMetadata.some(([txid, txMeta]) => tx.hash === txid && txMeta.memo?.toLowerCase().includes(query)),
          )
          .map((tx: Transaction) => ({ type: ItemType.TransactionSection, data: tx as ExtendedTransaction & LightningTransaction })),
      );

      const filteredOrder = [...filteredWallets, ...filteredTransactions];

      return {
        ...state,
        tempOrder: filteredOrder,
      };
    }
    case SAVE_CHANGES: {
      return {
        ...state,
        wallets: deepCopyWallets(action.payload),
        tempOrder: state.tempOrder.map(item =>
          item.type === ItemType.WalletSection
            ? { ...item, data: action.payload.find(wallet => wallet.getID() === item.data.getID())! }
            : item,
        ),
      };
    }
    case SET_TEMP_ORDER: {
      return { ...state, tempOrder: action.payload };
    }
    case REMOVE_WALLET: {
      const updatedOrder = state.tempOrder.filter(item => item.type !== ItemType.WalletSection || item.data.getID() !== action.payload);
      return {
        ...state,
        tempOrder: updatedOrder,
      };
    }
    case SET_CURRENT_SORT:
      return { ...state, currentSort: action.payload };
    default:
      throw new Error(`Unhandled action type: ${(action as ReducerAction).type}`);
  }
};

const ManageWallets: React.FC = () => {
  const sortableList = useRef(null);
  const { colors, closeImage } = useTheme();
  const { wallets: storedWallets, setWalletsWithNewOrder, txMetadata } = useStorage();
  const { setIsDrawerShouldHide } = useSettings();
  const walletsRef = useRef<TWallet[]>(deepCopyWallets(storedWallets)); // Create a deep copy of wallets for the DraggableFlatList
  const { navigate, setOptions, goBack } = useExtendedNavigation();
  const [state, dispatch] = useReducer(reducer, initialState);

  const stylesHook = {
    root: {
      backgroundColor: colors.elevated,
    },
    tip: {
      backgroundColor: colors.ballOutgoingExpired,
    },
    noResultsText: {
      color: colors.foregroundColor,
    },
  };

  useEffect(() => {
    const initialOrder: Item[] = wallets.map(wallet => ({ type: ItemType.WalletSection, data: wallet }));
    dispatch({ type: SET_WALLET_DATA, payload: wallets });
    dispatch({ type: SET_TX_METADATA, payload: txMetadata });
    dispatch({ type: SET_ORDER, payload: initialOrder });
  }, [wallets, txMetadata]);

  const handleClose = useCallback(() => {
    // Filter out only wallet items from the order array
    const walletOrder = state.order.filter((item): item is WalletItem => item.type === ItemType.WalletSection).map(item => item.data);

    setWalletsWithNewOrder(walletOrder);
    goBack();
  }, [goBack, setWalletsWithNewOrder, state.order]);

  const HeaderRightButton = useMemo(
    () => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={loc._.close}
        style={styles.button}
        onPress={handleClose}
        testID="NavigationCloseButton"
      >
        <Image source={closeImage} />
      </TouchableOpacity>
    ),
    [handleClose, closeImage],
  );

  const moreOptionsActions = useMemo((): Action[] | Action[][] => {
    return [
      {
        id: 'sort_by_menu',
        text: loc.cc.sort_by,
        subactions: [
          {
            id: 'sort_by_order',
            displayInline: true,
            text: loc.wallets.sort_by_order,
            keepsMenuPresented: true,
            subactions: [
              { ...CommonToolTipActions.SortASC, menuState: state.currentSort === SortOption.ASC },
              { ...CommonToolTipActions.SortDESC, menuState: state.currentSort === SortOption.DESC },
            ],
          },
          {
            id: 'sort_by_wallet',
            displayInline: true,
            text: loc.wallets.sort_by_property,
            subactions: [
              {
                ...CommonToolTipActions.SortBalance,
                menuState: state.currentSort === SortOption.Balance,
                disabled: state.currentSort === SortOption.Balance,
              },
              {
                ...CommonToolTipActions.SortLabel,
                menuState: state.currentSort === SortOption.Label,
                disabled: state.currentSort === SortOption.Label,
              },
              {
                ...CommonToolTipActions.MostRecentTransaction,
                menuState: state.currentSort === SortOption.MostRecent,
                disabled: state.currentSort === SortOption.MostRecent,
              },
            ],
          },
          { ...CommonToolTipActions.Reset },
        ],
      },
    ];
  }, [state.currentSort]);

  const moreOptionsOnPressMenuItem = useCallback(
    (id: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      switch (id) {
        case CommonToolTipActions.SortASC.id: {
          dispatch({ type: SET_CURRENT_SORT, payload: SortOption.ASC });
          const sortedWallets = state.tempOrder
            .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
            .sort((a, b) => a.data.getLabel()!.localeCompare(b.data.getLabel()!));
          dispatch({ type: SET_TEMP_ORDER, payload: sortedWallets });
          break;
        }
        case CommonToolTipActions.SortDESC.id: {
          dispatch({ type: SET_CURRENT_SORT, payload: SortOption.DESC });
          const sortedWallets = state.tempOrder
            .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
            .sort((a, b) => b.data.getLabel()!.localeCompare(a.data.getLabel()!));
          dispatch({ type: SET_TEMP_ORDER, payload: sortedWallets });
          break;
        }
        case CommonToolTipActions.SortBalance.id: {
          dispatch({ type: SET_CURRENT_SORT, payload: SortOption.Balance });
          const sortedWallets = state.tempOrder
            .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
            .sort((a, b) => a.data.getBalance() - b.data.getBalance());
          dispatch({ type: SET_TEMP_ORDER, payload: sortedWallets });
          break;
        }
        case CommonToolTipActions.SortLabel.id: {
          dispatch({ type: SET_CURRENT_SORT, payload: SortOption.Label });
          const sortedWalletsByLabel = state.tempOrder
            .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
            .sort((a, b) => a.data.getLabel()!.localeCompare(b.data.getLabel()!));
          dispatch({ type: SET_TEMP_ORDER, payload: sortedWalletsByLabel });
          break;
        }
        case CommonToolTipActions.MostRecentTransaction.id: {
          dispatch({ type: SET_CURRENT_SORT, payload: SortOption.MostRecent });
          const sortedWalletsByMostRecent = state.tempOrder
            .filter((item): item is WalletItem => item.type === ItemType.WalletSection)
            .sort((a, b) => {
              return b.data.getTransactions()[0]?.time - a.data.getTransactions()[0]?.time;
            });
          dispatch({ type: SET_TEMP_ORDER, payload: sortedWalletsByMostRecent });
          break;
        }
        case CommonToolTipActions.Reset.id: {
          dispatch({ type: SET_TEMP_ORDER, payload: state.order });
          break;
        }
      }
    },
    [state.order, state.tempOrder],
  );

  const SaveButton = useMemo(
    () => <HeaderRightButton disabled={!hasUnsavedChanges} title={loc.send.input_done} onPress={handleClose} />,
    [handleClose, hasUnsavedChanges],
  );

  const MoreButton = useMemo(
    () => <MoreOptionsButton isMenuPrimaryAction actions={moreOptionsActions} onPressMenuItem={moreOptionsOnPressMenuItem} />,
    [moreOptionsActions, moreOptionsOnPressMenuItem],
  );

  const HeaderRight = useCallback(
    () => (
      <>
        {MoreButton}
        <View style={styles.separation} />
        {SaveButton}
      </>
    ),
    [MoreButton, SaveButton],
  );

  useLayoutEffect(() => {
    setOptions({
      headerLeft: () => HeaderLeftButton,
      headerRight: HeaderRight,
      headerSearchBarOptions: searchBarOptions,
    });
  }, [setOptions, HeaderLeftButton, SaveButton, MoreButton, HeaderRight]);

  useFocusEffect(
    useCallback(() => {
      setIsDrawerShouldHide(true);
      const beforeRemoveListener = (e: { preventDefault: () => void; data: { action: any } }) => {
        if (!hasUnsavedChanges) {
          return;
        }

        e.preventDefault();

        Alert.alert(loc._.discard_changes, loc._.discard_changes_explain, [
          { text: loc._.cancel, style: 'cancel', onPress: () => {} },
          {
            text: loc._.ok,
            style: 'default',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]);
      };

      // @ts-ignore: fix later
      beforeRemoveListenerRef.current = beforeRemoveListener;

      navigation.addListener('beforeRemove', beforeRemoveListener);

      return () => {
        if (beforeRemoveListenerRef.current) {
          navigation.removeListener('beforeRemove', beforeRemoveListenerRef.current);
        }
        setIsDrawerShouldHide(false);
      };
    }, [hasUnsavedChanges, navigation, setIsDrawerShouldHide]),
  );

  const renderHighlightedText = useCallback(
    (text: string, query: string) => {
      const parts = text.split(new RegExp(`(${query})`, 'gi'));
      return (
        <Text>
          {parts.map((part, index) =>
            query && part.toLowerCase().includes(query.toLowerCase()) ? (
              <Animated.View key={`${index}-${query}`} style={[styles.highlightedContainer, { transform: [{ scale: bounceAnim }] }]}>
                <Text style={styles.highlighted}>{part}</Text>
              </Animated.View>
            ) : (
              <Text key={`${index}-${query}`} style={query ? styles.dimmedText : styles.defaultText}>
                {part}
              </Text>
            ),
          )}
        </Text>
      );
    },
    [bounceAnim],
  );

  const presentWalletHasBalanceAlert = useCallback(async (wallet: TWallet) => {
    triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
    try {
      const walletBalanceConfirmation = await prompt(
        loc.wallets.details_delete_wallet,
        loc.formatString(loc.wallets.details_del_wb_q, { balance: wallet.getBalance() }),
        true,
        'plain-text',
        true,
        loc.wallets.details_delete,
      );
      if (Number(walletBalanceConfirmation) === wallet.getBalance()) {
        dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
      } else {
        triggerHapticFeedback(HapticFeedbackTypes.NotificationError);
        presentAlert({ message: loc.wallets.details_del_wb_err });
      }
    } catch (_) {}
  }, []);

  const handleDeleteWallet = useCallback(
    async (wallet: TWallet) => {
      triggerHapticFeedback(HapticFeedbackTypes.NotificationWarning);
      Alert.alert(
        loc.wallets.details_delete_wallet,
        loc.wallets.details_are_you_sure,
        [
          {
            text: loc.wallets.details_yes_delete,
            onPress: async () => {
              const isBiometricsEnabled = await isBiometricUseCapableAndEnabled();

              if (isBiometricsEnabled) {
                if (!(await unlockWithBiometrics())) {
                  return;
                }
              }
              if (wallet.getBalance() > 0 && wallet.allowSend()) {
                presentWalletHasBalanceAlert(wallet);
              } else {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                dispatch({ type: REMOVE_WALLET, payload: wallet.getID() });
              }
            },
            style: 'destructive',
          },
          { text: loc.wallets.details_no_cancel, onPress: () => {}, style: 'cancel' },
        ],
        { cancelable: false },
      );
    },
    [isBiometricUseCapableAndEnabled, presentWalletHasBalanceAlert],
  );

  const handleToggleHideBalance = useCallback(
    (wallet: TWallet) => {
      const updatedOrder = state.tempOrder.map(item => {
        if (item.type === ItemType.WalletSection && item.data.getID() === wallet.getID()) {
          item.data.hideBalance = !item.data.hideBalance;
          return {
            ...item,
            data: item.data,
          };
        }
        return item;
      });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

      dispatch({ type: SET_TEMP_ORDER, payload: updatedOrder });
    },
    [state.tempOrder],
  );

  const navigateToWallet = useCallback(
    (wallet: TWallet) => {
      const walletID = wallet.getID();
      goBack();
      navigate('WalletTransactions', {
        walletID,
        walletType: wallet.type,
      });
    },
    [goBack, navigate],
  );

  const isDraggingDisabled = state.searchQuery.length > 0 || state.isSearchFocused;

  const bounceAnim = useBounceAnimation(state.searchQuery);

 
  const renderItem = useCallback(
    // eslint-disable-next-line react/no-unused-prop-types
    ({ item, drag, isActive }: { item: Item; drag: () => void; isActive: boolean }) => {
      if (item.type === ItemType.TransactionSection && item.data) {
        const w = wallets.find(wallet => wallet.getTransactions().some((tx: Transaction) => (tx as ExtendedTransaction).hash === item.data.hash));
        const walletID = w ? w.getID() : '';
        return (
          <TransactionListItem
            item={item.data}
            itemPriceUnit={item.data.walletPreferredBalanceUnit || DoichainUnit.DOI}
            walletID={walletID}
            searchQuery={state.searchQuery}
            renderHighlightedText={renderHighlightedText}
          />
        );
      } else if (item.type === ItemType.WalletSection) {
        return (
          <ScaleDecorator>
            <WalletCarouselItem
              item={item.data}
              handleLongPress={isDraggingDisabled ? undefined : drag}
              isActive={isActive}
              onPress={() => navigateToWallet(item.data)}
              customStyle={styles.padding16}
              searchQuery={state.searchQuery}
              renderHighlightedText={renderHighlightedText}
            />
          </ScaleDecorator>
        );
      }
      return null;
    },
    [wallets, isDraggingDisabled, navigateToWallet, state.searchQuery, renderHighlightedText],
  );

  const onChangeOrder = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactMedium);
  }, []);

  const onDragBegin = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.Selection);
  }, []);

  const onRelease = useCallback(() => {
    triggerHapticFeedback(HapticFeedbackTypes.ImpactLight);
  }, []);

  const onDragEnd = useCallback(({ data }: any) => {
    dispatch({ type: SET_ORDER, payload: data });
  }, []);

  const _keyExtractor = useCallback((_item: any, index: number) => index.toString(), []);

  const renderHeader = useMemo(() => {
    if (!state.searchQuery) return null;
    const hasWallets = state.walletData.length > 0;
    const filteredTxMetadata = Object.entries(state.txMetadata).filter(([_, tx]) =>
      tx.memo?.toLowerCase().includes(state.searchQuery.toLowerCase()),
    );
    const hasTransactions = filteredTxMetadata.length > 0;

    return (
      !hasWallets &&
      !hasTransactions && <Text style={[styles.noResultsText, stylesHook.noResultsText]}>{loc.wallets.no_results_found}</Text>
    );
  }, [state.searchQuery, state.walletData.length, state.txMetadata, stylesHook.noResultsText]);

  return (
    <GestureHandlerRootView style={[{ backgroundColor: colors.background }, styles.root]}>
      <NestableScrollContainer contentInsetAdjustmentBehavior="automatic" automaticallyAdjustContentInsets scrollEnabled>
        {renderHeader}
        <NestableDraggableFlatList
          data={state.tempOrder.filter((item): item is WalletItem => item.type === ItemType.WalletSection)}
          extraData={state.tempOrder}
          keyExtractor={keyExtractor}
          renderItem={renderWalletItem}
          onChangeOrder={onChangeOrder}
          onDragBegin={onDragBegin}
          onPlaceholderIndexChange={onChangeOrder}
          onRelease={onRelease}
          delayLongPress={150}
          useNativeDriver={true}
          dragItemOverflow
          autoscrollThreshold={1}
          renderPlaceholder={renderPlaceholder}
          autoscrollSpeed={0.5}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets
          onDragEnd={onDragEnd}
          containerStyle={styles.root}
        />
        <NestableDraggableFlatList
          data={state.tempOrder.filter((item): item is TransactionItem => item.type === ItemType.TransactionSection)}
          keyExtractor={keyExtractor}
          renderItem={renderWalletItem}
          dragItemOverflow
          containerStyle={styles.root}
          contentInsetAdjustmentBehavior="automatic"
          automaticallyAdjustContentInsets
          useNativeDriver={true}
        />
      </NestableScrollContainer>
    </GestureHandlerRootView>
  );
};

export default ManageWallets;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  padding16: {
    padding: 16,
  },
  button: {
    padding: 16,
  },
  noResultsText: {
    fontSize: 19,
    fontWeight: 'bold',
    writingDirection: I18nManager.isRTL ? 'rtl' : 'ltr',
    textAlign: 'center',
    justifyContent: 'center',
    marginTop: 34,
  },
});

const iStyles = StyleSheet.create({
  highlightedContainer: {
    backgroundColor: 'white',
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    padding: 2,
    alignSelf: 'flex-start',
    textDecorationLine: 'underline',
    textDecorationStyle: 'double',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  highlighted: {
    color: 'black',
    fontSize: 19,
    fontWeight: '600',
  },
  defaultText: {
    fontSize: 19,
  },
  dimmedText: {
    opacity: 0.8,
  },
  separation: {
    width: 16,
  },
});
