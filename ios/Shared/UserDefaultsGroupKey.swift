//
//  UserDefaultsGroupKeys.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

enum UserDefaultsGroupKey: String {
  case GroupName = "group.org.doichain.doiwallet"
  case PreferredCurrency = "preferredCurrency"
  case ElectrumSettingsHost = "electrum_host"
  case ElectrumSettingsTCPPort = "electrum_tcp_port"
  case ElectrumSettingsSSLPort = "electrum_ssl_port"
  case AllWalletsBalance = "WidgetCommunicationAllWalletsSatoshiBalance"
  case AllWalletsLatestTransactionTime = "WidgetCommunicationAllWalletsLatestTransactionTime"
  case LatestTransactionIsUnconfirmed = "\"WidgetCommunicationLatestTransactionIsUnconfirmed\""
}
