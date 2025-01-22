//
//  MarketData.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//

import Foundation

struct MarketData:Codable  {
  var nextBlock: String
  var sats: String
  var price: String
  var rate: Double
  var volume: String
  var percent: Double 
  var formattedNextBlock: String {
    if nextBlock == "..." {
      return "..."
    } else {
      if let nextBlockInt = Int(nextBlock) {
        let numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal
        if let formattedNumber = numberFormatter.string(from: NSNumber(value: nextBlockInt)) {
          return "\(formattedNumber) sat/vb"
        }
      }
      return "\(nextBlock) sat/vb"  // Fallback in case the nextBlock cannot be converted to an Int
    }
  }
  var dateString: String = ""
  var formattedDate: String? {
    let isoDateFormatter = ISO8601DateFormatter()
    let dateFormatter = DateFormatter()
    dateFormatter.locale = Locale.current
    dateFormatter.timeStyle = .short
    
    if let date = isoDateFormatter.date(from: dateString) {
      return dateFormatter.string(from: date)
    }
    return nil
  }
  static let string = "MarketData"
}

enum MarketDataTimeline: String {
  case Previous = "previous"
  case Current = "current"
}
