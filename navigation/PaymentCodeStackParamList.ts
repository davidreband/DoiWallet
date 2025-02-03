import { DoichainUnit} from '../models/doichainUnits';

export type PaymentCodeStackParamList = {
  PaymentCode: { paymentCode: string };
  PaymentCodesList: {
    memo: string;
    address: string;
    walletID: string;
    amount: number;
    amountSats: number;
    unit: DoichainUnit;
    noRbf: boolean;    
    isTransactionReplaceable: boolean;
    launchedBy: string;
    isEditable: boolean;
    uri: string /* payjoin uri */;
  };
};
