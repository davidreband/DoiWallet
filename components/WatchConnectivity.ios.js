import React, { useEffect, useRef } from 'react';
import {
  transferCurrentComplicationUserInfo,
  transferUserInfo,
  updateApplicationContext,
  useInstalled,
  useReachability,
  watchEvents,
} from 'react-native-watch-connectivity';
import Notifications from '../blue_modules/notifications';
import { MultisigHDWallet } from '../class';
import loc, { formatBalance, transactionTimeToReadable } from '../loc';
import { Chain } from "../models/doichainUnits";
import { FiatUnit } from '../models/fiatUnit';
import { useSettings } from '../hooks/context/useSettings';
import { useStorage } from '../hooks/context/useStorage';

function WatchConnectivity() {
  const { walletsInitialized, wallets, fetchWalletTransactions, saveToDisk, txMetadata } = useStorage();
  const { preferredFiatCurrency } = useSettings();
  const isReachable = useReachability();
  const isInstalled = useInstalled(); // true | false
  const messagesListenerActive = useRef(false);
  const lastPreferredCurrency = useRef(FiatUnit.USD.endPointKey);

  useEffect(() => {
    let messagesListener = () => {};
    if (isInstalled && isReachable && walletsInitialized && messagesListenerActive.current === false) {
      messagesListener = watchEvents.addListener('message', handleMessages);
      messagesListenerActive.current = true;
    } else {
      messagesListener();
      messagesListenerActive.current = false;
    }
    return () => {
      messagesListener();
      messagesListenerActive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized, isReachable, isInstalled]);

  useEffect(() => {
    console.log(`Apple Watch: isInstalled: ${isInstalled}, isReachable: ${isReachable}, walletsInitialized: ${walletsInitialized}`);
    if (isInstalled && walletsInitialized) {
      constructWalletsToSendToWatch().then(walletsToProcess => {
        if (walletsToProcess) {
          if (isReachable) {
            transferUserInfo(walletsToProcess);
            console.log('Apple Watch: sent info to watch transferUserInfo');
          } else {
            updateApplicationContext(walletsToProcess);
            console.log('Apple Watch: sent info to watch context');
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletsInitialized, wallets, isReachable, isInstalled]);

  useEffect(() => {
    if (walletsInitialized && isReachable && isInstalled) {
      updateApplicationContext({ isWalletsInitialized: walletsInitialized, randomID: Math.floor(Math.random() * 11) });
    }
  }, [isInstalled, isReachable, walletsInitialized]);

  useEffect(() => {
    if (isInstalled && isReachable && walletsInitialized && preferredFiatCurrency) {
      const preferredFiatCurrencyParsed = preferredFiatCurrency ?? FiatUnit.USD;
      try {
        if (lastPreferredCurrency.current !== preferredFiatCurrencyParsed.endPointKey) {
          transferCurrentComplicationUserInfo({
            preferredFiatCurrency: preferredFiatCurrencyParsed.endPointKey,
          });
          lastPreferredCurrency.current = preferredFiatCurrency.endPointKey;
        } else {
          console.log('WatchConnectivity lastPreferredCurrency has not changed');
        }
      } catch (e) {
        console.log('WatchConnectivity useEffect preferredFiatCurrency error');
        console.log(e);
      }
    }
  }, [preferredFiatCurrency, walletsInitialized, isReachable, isInstalled]);

  const handleMessages = (message, reply) => {
    if (message.request === 'createInvoice') {
      handleLightningInvoiceCreateRequest(message.walletIndex, message.amount, message.description)
        .then(createInvoiceRequest => reply({ invoicePaymentRequest: createInvoiceRequest }))
        .catch(e => {
          console.log(e);
          reply({});
        });
    } else if (message.message === 'sendApplicationContext') {
      constructWalletsToSendToWatch().then(walletsToProcess => {
        if (walletsToProcess) {
          updateApplicationContext(walletsToProcess);
        }
      });
    } else if (message.message === 'fetchTransactions') {
      fetchWalletTransactions()
        .then(() => saveToDisk())
        .finally(() => reply({}));
    } else if (message.message === 'hideBalance') {
      const walletIndex = message.walletIndex;
      const wallet = wallets[walletIndex];
      wallet.hideBalance = message.hideBalance;
      saveToDisk().finally(() => reply({}));
    }
  };

  const handleLightningInvoiceCreateRequest = async (walletIndex, amount, description = loc.lnd.placeholder) => {
    const wallet = wallets[walletIndex];
    if (wallet.allowReceive() && amount > 0) {
      try {
        const invoiceRequest = await wallet.addInvoice(amount, description);

        // lets decode payreq and subscribe groundcontrol so we can receive push notification when our invoice is paid
        try {
          // Let's verify if notifications are already configured. Otherwise the watch app will freeze waiting for user approval in iOS app
          if (await Notifications.isNotificationsEnabled()) {
            const decoded = await wallet.decodeInvoice(invoiceRequest);
            Notifications.majorTomToGroundControl([], [decoded.payment_hash], []);
          }
        } catch (e) {
          console.log('WatchConnectivity - Running in Simulator');
          console.log(e);
        }
        return invoiceRequest;
      } catch (error) {
        return error;
      }
    }
  };

  const constructWalletsToSendToWatch = async () => {
    if (!Array.isArray(wallets)) {
      console.log('No Wallets set to sync with Watch app. Exiting...');
      return;
    }
    if (!walletsInitialized) {
      console.log('Wallets not initialized. Exiting...');
      return;
    }
    const walletsToProcess = [];

    for (const wallet of wallets) {
      let receiveAddress;
      if (wallet.chain === Chain.ONCHAIN) {
        try {
          receiveAddress = await wallet.getAddressAsync();
        } catch (_) {}
        if (!receiveAddress) {
          // either sleep expired or getAddressAsync threw an exception
          receiveAddress = wallet._getExternalAddressByIndex(wallet.next_free_address_index);
        }
      } else if (wallet.chain === Chain.OFFCHAIN) {
        try {
          await wallet.getAddressAsync();
          receiveAddress = wallet.getAddress();
        } catch (_) {}
        if (!receiveAddress) {
          // either sleep expired or getAddressAsync threw an exception
          receiveAddress = wallet.getAddress();
        }
      }
      const transactions = wallet.getTransactions(10);
      const watchTransactions = [];
      for (const transaction of transactions) {
        let type = 'pendingConfirmation';
        let memo = '';
        let amount = 0;

        if ('confirmations' in transaction && !(transaction.confirmations > 0)) {
          type = 'pendingConfirmation';
        } else if (transaction.type === 'user_invoice' || transaction.type === 'payment_request') {
          const currentDate = new Date();
          const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
          const invoiceExpiration = transaction.timestamp + transaction.expire_time;

          if (invoiceExpiration > now) {
            type = 'pendingConfirmation';
          } else if (invoiceExpiration < now) {
            if (transaction.ispaid) {
              type = 'received';
            } else {
              type = 'sent';
            }
          }
        } else if (transaction.value / 100000000 < 0) {
          type = 'sent';
        } else {
          type = 'received';
        }
        if (transaction.type === 'user_invoice' || transaction.type === 'payment_request') {
          amount = isNaN(transaction.value) ? '0' : amount;
          const currentDate = new Date();
          const now = (currentDate.getTime() / 1000) | 0; // eslint-disable-line no-bitwise
          const invoiceExpiration = transaction.timestamp + transaction.expire_time;

          if (invoiceExpiration > now) {
            amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
          } else if (invoiceExpiration < now) {
            if (transaction.ispaid) {
              amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
            } else {
              amount = loc.lnd.expired;
            }
          } else {
            amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
          }
        } else {
          amount = formatBalance(transaction.value, wallet.getPreferredBalanceUnit(), true).toString();
        }
        if (txMetadata[transaction.hash] && txMetadata[transaction.hash].memo) {
          memo = txMetadata[transaction.hash].memo;
        } else if (transaction.memo) {
          memo = transaction.memo;
        }
        const watchTX = { type, amount, memo, time: transactionTimeToReadable(transaction.received) };
        watchTransactions.push(watchTX);
      }

      const walletInformation = {
        label: wallet.getLabel(),
        balance: formatBalance(Number(wallet.getBalance()), wallet.getPreferredBalanceUnit(), true),
        type: wallet.type,
        preferredBalanceUnit: wallet.getPreferredBalanceUnit(),
        receiveAddress,
        transactions: watchTransactions,
        hideBalance: wallet.hideBalance,
      };
      if (wallet.chain === Chain.ONCHAIN && wallet.type !== MultisigHDWallet.type) {
        walletInformation.xpub = wallet.getXpub() ? wallet.getXpub() : wallet.getSecret();
      }
      if (wallet.allowBIP47() && wallet.isBIP47Enabled()) {
        walletInformation.paymentCode = wallet.getBIP47PaymentCode();
      }
      walletsToProcess.push(walletInformation);
    }
    return { wallets: walletsToProcess, randomID: Math.floor(Math.random() * 11) };
  };

  return <></>;
}

export default WatchConnectivity;
