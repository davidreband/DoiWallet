import { address, nameops, opcodes, script } from '@doichain/doichainjs-lib';
import type { Network } from '@doichain/doichainjs-lib';

import { DOICHAIN } from '../blue_modules/network.js';

/** The longest name Doichain Core accepts, in bytes. */
export const NAME_MAX_LENGTH = nameops.MAX_NAME_LENGTH; // 255

/**
 * The longest value a name output can carry and still be spent, in bytes. Core accepts up to 1023,
 * but spending runs the whole output script and the interpreter refuses any push over 520 bytes, so
 * a longer value freezes the name and the DOI locked in it for good.
 */
export const VALUE_MAX_LENGTH = nameops.MAX_VALUE_LENGTH; // 520

/** A name is only safe with a holder DoiWallet can sign for. */
const SUPPORTED_OWNERS = 'P2PKH (D…) or P2WPKH (dc1q…)';

const ERRORS = {
  NAME_ID_DEFINED: 'nameId and nameValue must be defined',
  NAME_ID_LENGTH: `nameId must be at least 3 characters and not longer than ${NAME_MAX_LENGTH} bytes`,
  NAME_VALUE_LENGTH: `nameValue must not be longer than ${VALUE_MAX_LENGTH} bytes`,
  INVALID_ADDRESS: 'Invalid recipient address: ',
  UNSUPPORTED_OWNER: `A name can only be held by an address DoiWallet can spend from: ${SUPPORTED_OWNERS}. `,
};

/**
 * Whether an output script is one of the two holder types `Psbt` can sign a name input for.
 *
 * A name output is accepted by Doichain Core whatever its owner script says, so a name handed to a
 * P2SH or Taproot address is simply lost: it can never be transferred or updated again, and its
 * locked DOI are gone (Doichain/DoiWallet#36).
 */
const isSpendableOwner = (ownerScript: Uint8Array): boolean => {
  const chunks = script.decompile(ownerScript);
  if (!chunks) return false;

  // P2PKH: OP_DUP OP_HASH160 <20 bytes> OP_EQUALVERIFY OP_CHECKSIG
  if (
    chunks.length === 5 &&
    chunks[0] === opcodes.OP_DUP &&
    chunks[1] === opcodes.OP_HASH160 &&
    chunks[2] instanceof Uint8Array &&
    chunks[2].length === 20 &&
    chunks[3] === opcodes.OP_EQUALVERIFY &&
    chunks[4] === opcodes.OP_CHECKSIG
  ) {
    return true;
  }

  // P2WPKH: OP_0 <20 bytes>. A 32-byte program is P2WSH, and OP_1 <32 bytes> is Taproot.
  return chunks.length === 2 && chunks[0] === opcodes.OP_0 && chunks[1] instanceof Uint8Array && chunks[1].length === 20;
};

/**
 * Builds the output script of an `OP_NAME_DOI` operation, which registers, transfers or updates a
 * name: `OP_NAME_DOI <name> <value> OP_2DROP OP_DROP <owner's script>`.
 *
 * The script itself comes from `nameops.nameDoiScript()`, which pushes name and value with their
 * length in bytes - never as a number opcode - so an empty value and a one-byte value still produce
 * a valid name script. The owner's script comes from `address.toOutputScript()`, which checks both
 * the network and the address type, instead of reusing the address hash under a script shape of our
 * own choosing.
 *
 * @param nameId - The name. Normalized to NFC, since names that look alike but differ byte for byte
 *   are different names on the chain.
 * @param nameValue - The value, passed through as given. May be empty.
 * @param recipientAddress - The holder's Doichain address, P2PKH or P2WPKH.
 * @param network - The Doichain network, mainnet by default.
 * @returns The compiled name output script.
 */
export const getNameOPStackScript = (nameId: string, nameValue: string, recipientAddress: string, network: Network = DOICHAIN): Uint8Array => {
  if (!nameId || nameValue === undefined) {
    throw new Error(ERRORS.NAME_ID_DEFINED);
  }

  const name = nameId.normalize('NFC');

  // Both limits count bytes, not characters: a name of 200 × "ä" is 400 bytes and Core rejects it
  // as invalid, while a value over 520 bytes freezes the name for good (Doichain/DoiWallet#36).
  if (name.length < 3 || Buffer.byteLength(name, 'utf8') > NAME_MAX_LENGTH) {
    throw new Error(ERRORS.NAME_ID_LENGTH);
  }

  if (Buffer.byteLength(nameValue, 'utf8') > VALUE_MAX_LENGTH) {
    throw new Error(ERRORS.NAME_VALUE_LENGTH);
  }

  let ownerScript: Uint8Array;
  try {
    ownerScript = address.toOutputScript(recipientAddress, network);
  } catch (e) {
    throw new Error(ERRORS.INVALID_ADDRESS + (e as Error).message);
  }

  if (!isSpendableOwner(ownerScript)) {
    throw new Error(ERRORS.UNSUPPORTED_OWNER + `${recipientAddress} is neither.`);
  }

  return nameops.nameDoiScript(name, nameValue, ownerScript);
};

/**
 * Reads a name or a value out of a decompiled name script, for display.
 *
 * Names are UTF-8 on the chain, so that is how they are decoded; bytes that are not valid UTF-8 are
 * shown as hex rather than as replacement characters, so what the user confirms is never a silently
 * garbled name (Doichain/DoiWallet#36). An empty push arrives as the opcode `OP_0`, i.e. a number
 * rather than a buffer, which is an empty value.
 */
export const decodeNameBytes = (chunk: Uint8Array | number | undefined): string => {
  // script.decompile hands out Uint8Array since bitcoinjs 7, no longer Buffer
  if (!(chunk instanceof Uint8Array)) return '';

  const bytes = Buffer.from(chunk);
  const text = bytes.toString('utf8');
  // Buffer turns invalid sequences into U+FFFD, so a round-trip that differs means it was not UTF-8
  return Buffer.from(text, 'utf8').equals(bytes) ? text : bytes.toString('hex');
};
