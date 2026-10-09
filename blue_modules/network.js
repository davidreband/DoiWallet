import { networks } from '@doichain/doichainjs-lib';

export const VERSION = 0x7100;

// The prefixes come from doichainjs-lib, which reads them from chainparams.cpp in Doichain Core.
// Keeping our own copy here had drifted: the mainnet BIP32 private prefix read 0x0499ade4 while
// Core uses 0x0488ade4, so DoiWallet rejected every standard extended private key on mainnet and
// silently dropped a cosigner's key when importing an Electrum multisig file
// (Doichain/DoiWallet#34). Taking them from the library keeps them in step with Core.
export const DOICHAIN_MAINNET = { name: 'mainnet', ...networks.doichain };

export const DOICHAIN_TESTNET = { name: 'testnet', ...networks.doichainTestnet };

export const DOICHAIN_REGTEST = { name: 'regtest', ...networks.doichainRegtest };

export const DOICHAIN = DOICHAIN_MAINNET;
