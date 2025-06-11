
import { Psbt } from '@doichain/doichainjs-lib';
import { CreateTransactionTarget, CreateTransactionUtxo, TWallet } from '../class/wallets/types';
import { DoichainUnit, Chain } from '../models/doichainUnits';
import { ScanQRCodeParamList } from './DetailViewStackParamList';

export interface NameOpParams {
  nameId: string;
  nameValue: string;
  sendTo: string;
  nameOpAddress: string;
}

export type SendDetailsParams = {
  transactionMemo?: string;
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
  };
  CreateTransaction: {
    memo?: string;
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
    fromWallet: string;
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
