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

/**
 * What a name output on screen is, relative to what the chain says about that name.
 *
 * `holds` - this very output is the operation holding the name AND the holder is an address of
 * ours, so it is the one a transfer would spend and we can sign for it. `notOurs` - this output
 * does hold the name, but somebody else holds it. `superseded` - the name has moved on and this
 * output is history; the operation that holds it now comes with the answer, so the screen can say
 * where it went. `unknown` - the chain was not reachable or has no operation on this name, and
 * nothing should be claimed either way.
 */
export type NameOutputStatus =
  | { status: 'holds' }
  | { status: 'notOurs'; heldBy: NameOperation }
  | { status: 'superseded'; heldBy: NameOperation }
  | { status: 'unknown' };

/**
 * Says whether the name output being looked at still holds its name, and whether it is ours.
 *
 * Both halves matter and each one alone has been wrong on screen. The transaction a user opens may
 * be years old and the name can have moved on since, which is what left the transfer form on an
 * output holding nothing. But the chain saying an output holds the name is not enough either: the
 * transaction a user opens to look at a name they sent away IS the transfer, and its name output
 * holds the name perfectly well - for the recipient. Offering to send it on from there asks the
 * wallet to sign for a key it does not have (Doichain/DoiWallet#35).
 *
 * Pass what the chain answered, null when it could not be asked, and a predicate that says whether
 * an address is one of ours - the wallet is deliberately not imported here.
 */
export const describeNameOutput = (
  output: { txid: string; vout: number },
  state: NameState | null,
  weOwnAddress: (address: string) => boolean,
): NameOutputStatus => {
  if (!state) return { status: 'unknown' };

  const held = state.operation;
  if (held.txid !== output.txid || held.vout !== output.vout) return { status: 'superseded', heldBy: held };
  if (!weOwnAddress(held.address)) return { status: 'notOurs', heldBy: held };

  return { status: 'holds' };
};
