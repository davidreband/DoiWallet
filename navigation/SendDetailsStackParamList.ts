import { Psbt } from '@doichain/doichainjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet, Utxo } from '../class/wallets/types';
import { DoichainUnit, Chain } from '../models/doichainUnits';
import { ScanQRCodeParamList } from './DetailViewStackParamList';
import { IFee } from '../screen/send/SendDetails';
import { NetworkTransactionFeeType } from '../models/networkTransactionFees';

export interface NameOpParams {
  nameId: string;
  nameValue: string;
  sendTo: string;
  /**
   * The output the chain says currently holds the name, from the ElectrumX name index. Picking the
   * input by holder address instead was wrong: a wallet reuses its addresses, so one address can
   * hold several names at once - seven of them on a single address in our own regtest runs - and
   * nothing said which one would be found (Doichain/DoiWallet#35).
   *
   * Absent for a first registration, which has no previous output to spend.
   */
  nameOutpoint?: { txid: string; vout: number };
}

export type SendDetailsParams = {
  transactionMemo?: string;
  memo?: string;
  isTransactionReplaceable?: boolean;
  payjoinUrl?: string;
  feeUnit?: DoichainUnit;
  frozenBalance?: number;
  amountUnit?: DoichainUnit;
  address?: string;
  amount?: number;
  amountSats?: number;
  unit?: DoichainUnit;
  onBarScanned?: string;
  noRbf?: boolean;
  walletID: string;
  launchedBy?: string;
  utxos?: CreateTransactionUtxo[] | null;
  isEditable?: boolean;
  uri?: string;
  paymentCode?: string;
  selectedFeeRate?: string | undefined;
  selectedFeeType?: NetworkTransactionFeeType;
  addRecipientParams?: {
    address: string;
    amount?: number;
    memo?: string;
  };
  nameOp?: NameOpParams;
};

export type TNavigation = {
  pop: () => void;
  navigate: () => void;
};

export type TNavigationWrapper = {
  navigation: TNavigation;
};

export type SendDetailsStackParamList = {
  SendDetails: SendDetailsParams;
  CoinControlOutput: {
    walletID: string;
    utxo: Utxo;
  };
  SelectFee: {
    networkTransactionFees: {
      fastestFee: number;
      mediumFee: number;
      slowFee: number;
    };
    feePrecalc: IFee;
    feeRate: string;
    feeUnit?: DoichainUnit;
    walletID: string;
    customFee?: string | null;
  };
  Confirm: {
    fee: number;
    memo?: string;
    walletID: string;
    tx: string;
    targets?: CreateTransactionTarget[]; // needed to know if there were paymentCodes, which turned into addresses in `recipients`
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    payjoinUrl?: string | null;
    psbt: Psbt;
  };
  PsbtWithHardwareWallet: {
    memo?: string;
    walletID: string;
    launchedBy?: string;
    psbt?: Psbt;
    txhex?: string;
    deepLinkPSBT?: string;
    onBarScanned?: string;
  };
  CreateTransaction: {
    memo?: string;
    wallet?: TWallet;
    psbt?: Psbt;
    txhex?: string;
    tx: string;
    fee: number;
    showAnimatedQr?: boolean;
    recipients: CreateTransactionTarget[];
    satoshiPerByte: number;
    feeSatoshi?: number;
  };
  PsbtMultisig: {
    memo?: string;
    psbtBase64: string;
    walletID: string;
    launchedBy?: string;
  };
  PsbtMultisigQRCode: {
    memo?: string;
    psbtBase64: string;
    walletID: string;
    launchedBy?: string;
    isShowOpenScanner?: boolean;
    onBarScanned?: string;
  };
  Success: {
    fee?: number;
    amount: number;
    amountUnit?: DoichainUnit;
    txid?: string;
    invoiceDescription?: string;
  };
  SelectWallet: {
    chainType?: Chain;
    onWalletSelect?: (wallet: TWallet, navigationWrapper: TNavigationWrapper) => void;
    availableWallets?: TWallet[];
    noWalletExplanationText?: string;
    onChainRequireSend?: boolean;
    selectedWalletID?: string; // Add this parameter to scroll to a specific wallet
  };
  CoinControl: {
    walletID: string;
  };
  PaymentCodeList: {
    walletID: string;
    merge?: boolean;
  };
  ScanQRCode: ScanQRCodeParamList;
};
