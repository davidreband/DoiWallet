import { networks } from '@doichain/doichainjs-lib';

export const VERSION = 0x7100;

// The chain's fee floor, in satoshi per vByte.
//
// Doichain Core's DEFAULT_MIN_RELAY_TX_FEE is COIN/1000 per kvB, which is 100 sat/vByte, and the
// mining node keeps that default. The relay fee a server advertises is deliberately NOT used
// instead: the doi.works fleet runs with minrelaytxfee=0.00000001, so it happily relays a
// transaction that the miner then never includes - it just sits in the mempool and looks sent
// (Doichain/DoiWallet#39). This is a floor, not a fixed price: a server estimate above it wins.
export const MIN_RELAY_FEE_SAT_PER_VBYTE = 100;

// The prefixes come from doichainjs-lib, which reads them from chainparams.cpp in Doichain Core.
// Keeping our own copy here had drifted: the mainnet BIP32 private prefix read 0x0499ade4 while
// Core uses 0x0488ade4, so DoiWallet rejected every standard extended private key on mainnet and
// silently dropped a cosigner's key when importing an Electrum multisig file
// (Doichain/DoiWallet#34). Taking them from the library keeps them in step with Core.
export const DOICHAIN_MAINNET = { name: 'mainnet', ...networks.doichain };

export const DOICHAIN_TESTNET = { name: 'testnet', ...networks.doichainTestnet };

export const DOICHAIN_REGTEST = { name: 'regtest', ...networks.doichainRegtest };

export const DOICHAIN = DOICHAIN_MAINNET;
