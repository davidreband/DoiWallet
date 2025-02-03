//
//  UserDefaultsGroup.swift
//  MarketWidgetExtension
//
//  Created by Marcos Rodriguez on 10/31/20.
//  Copyright © 2020 BlueWallet. All rights reserved.
//

import Foundation

struct UserDefaultsElectrumSettings {
  let host: String?
  let port: UInt16?
  let sslPort: UInt16?
}

let hardcodedPeers = [
    UserDefaultsElectrumSettings(host: "itchy-jellyfish-89.doi.works", port: 5001, sslPort: 50002),
    UserDefaultsElectrumSettings(host: "big-parrot-60.doi.works", port: 5001, sslPort: 50002),
    UserDefaultsElectrumSettings(host: "ugly-bird-70.doi.works", port: 5001, sslPort: 50002),
]

let DefaultElectrumPeers = [
    UserDefaultsElectrumSettings(host: "itchy-jellyfish-89.doi.works", port: 5001, sslPort: 50002), //
] + hardcodedPeers

class UserDefaultsGroup {
  static private let suite = UserDefaults(suiteName: UserDefaultsGroupKey.GroupName.rawValue)

  static func getElectrumSettings() -> UserDefaultsElectrumSettings {
         // Ensure the suite exists
         guard let suite = UserDefaultsGroup.suite else {
             // Return a default Electrum setting if suite is unavailable
             return UserDefaultsElectrumSettings(host: "electrum.blockstream.info", port: 50002, sslPort: 50001)
         }
         
         // Retrieve Electrum host
         guard let electrumSettingsHost = suite.string(forKey: UserDefaultsGroupKey.ElectrumSettingsHost.rawValue),
               !electrumSettingsHost.isEmpty else {
             // Return a random default Electrum peer if host is not set
             if let defaultPeer = DefaultElectrumPeers.randomElement() {
                 return defaultPeer
             } else {
                 // Fallback to a known default
                 return UserDefaultsElectrumSettings(host: "electrum.blockstream.info", port: 50002, sslPort: 50001)
             }
         }
         
         // Retrieve and convert TCP port
         let electrumSettingsTCPPortString = suite.string(forKey: UserDefaultsGroupKey.ElectrumSettingsTCPPort.rawValue) ?? "50001"
         let electrumSettingsSSLPortString = suite.string(forKey: UserDefaultsGroupKey.ElectrumSettingsSSLPort.rawValue) ?? "50002"
         
         // Safely convert port strings to UInt16
         let port: UInt16 = UInt16(electrumSettingsTCPPortString) ?? 50001
         let sslPort: UInt16 = UInt16(electrumSettingsSSLPortString) ?? 50002
         
         return UserDefaultsElectrumSettings(host: electrumSettingsHost, port: port, sslPort: sslPort)
     }
  
  static func getAllWalletsBalance() -> Double {
    guard let allWalletsBalance = suite?.string(forKey: UserDefaultsGroupKey.AllWalletsBalance.rawValue) else {
      return 0
    }

    return Double(allWalletsBalance) ?? 0
  }
  
  // Int: EPOCH value, Bool: Latest transaction is unconfirmed
  static func getAllWalletsLatestTransactionTime() -> LatestTransaction {
    guard let allWalletsTransactionTime = suite?.string(forKey: UserDefaultsGroupKey.AllWalletsLatestTransactionTime.rawValue) else {
      return LatestTransaction(isUnconfirmed: false, epochValue: 0)
    }
    
    if allWalletsTransactionTime == UserDefaultsGroupKey.LatestTransactionIsUnconfirmed.rawValue {
      return LatestTransaction(isUnconfirmed: true, epochValue: 0)
    } else {
      return LatestTransaction(isUnconfirmed: false, epochValue: Int(allWalletsTransactionTime))
    }
  }
  
}
