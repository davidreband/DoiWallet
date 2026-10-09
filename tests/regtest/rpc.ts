/**
 * Talks to the throwaway Doichain Core regtest node started by scripts/regtest-node.sh.
 *
 * It shells out to doichain-cli rather than speaking JSON-RPC itself: the node is a local test
 * fixture, the calls are few, and this keeps the helper free of any dependency or credential
 * handling.
 */
import { execFileSync } from 'child_process';
import path from 'path';

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const REGTEST_DIR = process.env.DOICHAIN_REGTEST_DIR ?? path.join(PROJECT_ROOT, '.regtest');
const CLI = path.join(REGTEST_DIR, 'bin', 'doichain-cli');
const DATA_DIR = path.join(REGTEST_DIR, 'data');

export const COIN = 100000000;

/** The amount Core locks in every name output: MinNameCoinAmount, COIN/100. */
export const MIN_NAME_AMOUNT = 1000000;

export type Outpoint = {
  txid: string;
  vout: number;
  /** in satoshi */
  value: number;
  /** the output's real scriptPubKey */
  script: string;
};

export const toSat = (doi: number | string): number => Math.round(Number(doi) * COIN);

export const cli = <T = any>(...args: string[]): T => {
  const out = execFileSync(CLI, [`-datadir=${DATA_DIR}`, '-rpcport=19443', '-rpcuser=rt', '-rpcpassword=rt', ...args], {
    encoding: 'utf8',
  }).trim();
  try {
    return JSON.parse(out) as T;
  } catch {
    return out as unknown as T;
  }
};

/** Whether the node is reachable, so a suite can skip instead of failing when it is not running. */
export const isNodeUp = (): boolean => {
  try {
    return cli<{ chain: string }>('getblockchaininfo').chain === 'regtest';
  } catch {
    return false;
  }
};

export const mine = (blocks = 1): void => {
  cli('generatetoaddress', String(blocks), cli('getnewaddress', '', 'legacy'));
};

/** Sends coins from the node's wallet to an address of ours and returns the outpoint it created. */
export const fundAddress = (address: string, doi = 1): Outpoint => {
  const txid = cli<string>('sendtoaddress', address, String(doi));
  mine();
  return outputPayingTo(txid, address);
};

export const outputPayingTo = (txid: string, address: string): Outpoint => {
  const tx = cli<any>('getrawtransaction', txid, 'true');
  const out = tx.vout.find((v: any) => v.scriptPubKey.address === address);
  if (!out) throw new Error(`${txid} has no output paying to ${address}`);
  return { txid, vout: out.n, value: toSat(out.value), script: out.scriptPubKey.hex };
};

/** The name output of a transaction, i.e. the one Core decoded a nameOp for. */
export const nameOutputOf = (txid: string): Outpoint & { nameOp: { op: string; name: string; value: string } } => {
  const tx = cli<any>('getrawtransaction', txid, 'true');
  const out = tx.vout.find((v: any) => v.scriptPubKey.nameOp);
  if (!out) throw new Error(`${txid} carries no name output`);
  return { txid, vout: out.n, value: toSat(out.value), script: out.scriptPubKey.hex, nameOp: out.scriptPubKey.nameOp };
};

/** What Core thinks of a raw transaction, without putting it in the mempool. */
export const testAccept = (hex: string): { allowed: boolean; reason?: string } => {
  const [res] = cli<any[]>('testmempoolaccept', JSON.stringify([hex]));
  return { allowed: res.allowed, reason: res['reject-reason'] };
};

export const broadcast = (hex: string): string => {
  const txid = cli<string>('sendrawtransaction', hex);
  mine();
  return txid;
};

export const nameShow = (name: string): { name: string; value: string; address: string; height: number } => cli('name_show', name);

/** A fresh name per run, so a rerun never collides with a name the previous one registered. */
export const uniqueName = (prefix: string): string => `${prefix}${cli<number>('getblockcount')}${Math.floor(Math.random() * 1e6)}`;
