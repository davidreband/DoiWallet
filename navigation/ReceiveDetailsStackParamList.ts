export type ReceiveDetailsStackParamList = {
  ReceiveDetails: {
    walletID?: string;
    address?: string;
    customLabel?: string;
    customAmount?: string;
    customUnit?: import('../models/doichainUnits').DoichainUnit;
    bip21encoded?: string;
    isCustom?: boolean;
  };
  ReceiveCustomAmount: {
    address: string;
    currentLabel?: string;
    currentAmount?: string;
    currentUnit?: import('../models/doichainUnits').DoichainUnit;
    preferredUnit?: import('../models/doichainUnits').DoichainUnit;
  };
};
