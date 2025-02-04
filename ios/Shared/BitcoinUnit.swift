//
//  DoichainUnit.swift
//  BlueWallet
//
//  Created by Marcos Rodriguez on 4/14/24.
//  Copyright © 2024 BlueWallet. All rights reserved.
//
import Foundation


/// Represents the various balance units used in the application.
/// Conforms to `String`, `Codable`, `Equatable`, and `CustomStringConvertible` for easy encoding/decoding, comparisons, and descriptions.
enum BitcoinUnit: String, Codable, Equatable, CustomStringConvertible {
    case btc = "BTC"
    case sats = "sats"
    case localCurrency = "local_currency"
    case max = "MAX"

enum DoichainUnit: String {
    case DOI = "DOI"
    case SWARTZ = "SWARTZ"
    case localCurrency = "Local Currency"
    case max = "MAX"

    /// Provides a user-friendly description of the `BitcoinUnit`.
    var description: String {
        switch self {
        case .DOI:
            return "DOI"
        case .SWARTZ:
            return "SWARTZ"
        case .localCurrency:
            return "Local Currency"
        case .max:
            return "MAX"
        }
    }

    /// Initializes a `BitcoinUnit` from a raw string.
    /// - Parameter rawString: The raw string representing the balance unit.
    init(rawString: String) {
        switch rawString.lowercased() {
        case "DOI":
            self = .DOI
        case "SWARTZ":
            self = .SWARTZ
        case "local_currency":
            self = .localCurrency
        case "max":
            self = .max
        default:
            // Handle unknown balance units if necessary
            // For now, defaulting to .max
            self = .max
        }
    }
}

extension DoichainUnit {
    static var mockUnit: DoichainUnit {
        return .SWARTZ
    }

}
