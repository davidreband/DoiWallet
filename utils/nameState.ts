/**
 * Reading a name's state off its operations on the chain.
 *
 * Kept apart from BlueElectrum so it carries no connection and no React Native imports: this is the
 * part that says which operation holds a name, and it is worth testing on its own
 * (Doichain/DoiWallet#35).
 *
 * Whether a name has expired is deliberately NOT decided here. That is a consensus rule and the
 * chain owns it: Doichain Core's NameExpirationDepth is 36,000 blocks on mainnet but 30 on regtest,
 * so a single constant in the wallet is wrong on two networks out of three, and a wallet that
 * refuses an operation on its own arithmetic refuses things the chain would have accepted. Measured
 * on a v31.1.6 regtest node: a name_doi registered at height 230 reported expires_in=30 and was
 * gone from name_show 35 blocks later, after which anybody could register it again - so names do
 * expire, including Doichain's own OP_NAME_DOI, and it is the node that says when.
 */

export type NameOperation = {
  /** the transaction that carried out the operation */
  txid: string;
  /** index of its name output - the outpoint a transfer or update has to spend */
  vout: number;
  /** 0 or -1 while the transaction is still in the mempool */
  height: number;
  op: string;
  name: string;
  value: string;
  /** the holder */
  address: string;
};

/** Which operation holds a name right now. */
export type NameState = {
  /** the operation that holds the name; its outpoint is what a transfer or update has to spend */
  operation: NameOperation;
};

/**
 * Name operations oldest first, so the last one holds the name.
 *
 * A server returns confirmed entries oldest first and mempool entries last, but sorting here means
 * the answer does not depend on that. An operation still in the mempool (height 0 or -1) is the
 * newest one there is.
 */
export const sortNameOperations = (operations: NameOperation[]): NameOperation[] => {
  return [...operations].sort((a, b) => {
    if (a.height <= 0 && b.height <= 0) return 0;
    if (a.height <= 0) return 1;
    if (b.height <= 0) return -1;
    return a.height - b.height;
  });
};

/**
 * Reads which operation holds a name. Returns null when the name has no operations at all - and
 * note that this is not the same as the name being free: a name whose last operation has expired
 * still has a history, and only the node can say whether it is available again.
 */
export const readNameState = (operations: NameOperation[]): NameState | null => {
  const sorted = sortNameOperations(operations);
  if (sorted.length === 0) return null;

  return { operation: sorted[sorted.length - 1] };
};
