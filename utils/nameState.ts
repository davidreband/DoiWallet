/**
 * Reading a name's state off its operations on the chain.
 *
 * Kept apart from BlueElectrum so it carries no connection and no React Native imports: this is the
 * part that decides who holds a name and until when, and it is worth testing on its own
 * (Doichain/DoiWallet#35).
 */

/**
 * A name expires this many blocks after its newest operation, after which anybody can register it
 * again without a name input. Doichain Core, `src/consensus/params.h`.
 */
export const NAME_EXPIRY_BLOCKS = 36000;

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

/** What a name's newest operation says about it: who holds it and until when. */
export type NameState = {
  /** the operation that holds the name; its outpoint is what a transfer or update has to spend */
  operation: NameOperation;
  /** 0 while the operation is still in the mempool */
  expiresAtHeight: number;
  expired: boolean;
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
 * Reads a name's state off its operations, given the current block height. Returns null for a name
 * nobody has registered - that name is free.
 */
export const readNameState = (operations: NameOperation[], currentHeight: number): NameState | null => {
  const sorted = sortNameOperations(operations);
  if (sorted.length === 0) return null;

  const operation = sorted[sorted.length - 1];
  const expiresAtHeight = operation.height <= 0 ? 0 : operation.height + NAME_EXPIRY_BLOCKS;

  return {
    operation,
    expiresAtHeight,
    // an operation still in the mempool cannot have expired
    expired: expiresAtHeight > 0 && currentHeight >= expiresAtHeight,
  };
};
