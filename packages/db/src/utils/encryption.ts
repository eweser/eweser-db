/**
 * Purpose: Client-side E2EE crypto primitives for secure rooms.
 * Exports: Key generation, Yjs-update encrypt/decrypt, recovery-phrase derivation, key wrapping.
 * Touches: WebCrypto (browser + Node 19+), Yjs update streams.
 * Read before editing: docs/ai/adr/0011-secure-room-e2ee.md.
 */

import { BIP39_WORDLIST } from './bip39-wordlist.js';
import type {
  RoomEncryptionMetadata,
  RoomKeyExportMaterial,
} from '@eweser/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** AES-GCM IV length in bytes (NIST SP 800-38D). */
export const IV_LENGTH = 12;

/** Number of PBKDF2 iterations for room key derivation. */
export const DEFAULT_PBKDF2_ITERATIONS = 600_000;

/** Length of the BIP39 entropy in bytes (128 bits → 12 words). */
const ENTROPY_BITS = 128;
const ENTROPY_BYTES = ENTROPY_BITS / 8;

/** PBKDF2 iterations for BIP39 seed derivation (BIP-0039 standard). */
const BIP39_SEED_ITERATIONS = 2048;

/** Length of the BIP39 seed in bytes (512 bits). */
const BIP39_SEED_LENGTH = 64;

/** Salt length for room-scoped PBKDF2 in bytes. */
const SALT_LENGTH = 32;

/** Helper: coerce Uint8Array to a BufferSource-friendly slice. */
function toBufferSource(arr: Uint8Array): Uint8Array<ArrayBuffer> {
  // .slice() returns Uint8Array<ArrayBuffer> (backed by a real ArrayBuffer)
  return arr.slice();
}

/** Helper: get value at index with non-null assertion. */
function at<T>(arr: ArrayLike<T>, i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`Index ${i} out of bounds`);
  return v;
}

// ---------------------------------------------------------------------------
// Room key generation and raw import/export
// ---------------------------------------------------------------------------

/**
 * Generate a new random 256-bit AES-GCM room key.
 * The key is marked extractable for export/recovery scenarios.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — required for recovery phrase export
    ['encrypt', 'decrypt']
  );
}

/**
 * Import a raw 32-byte key as an AES-GCM CryptoKey.
 * The imported key is non-extractable by default to limit exposure.
 */
export async function importRoomKey(
  rawKey: ArrayBuffer,
  extractable = false
): Promise<CryptoKey> {
  if (rawKey.byteLength !== 32) {
    throw new Error(
      `Invalid room key length: expected 32 bytes, got ${rawKey.byteLength}`
    );
  }
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a CryptoKey as raw bytes.
 * Only works on extractable keys.
 */
export async function exportRoomKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
  if (!key.extractable) {
    throw new Error('Cannot export non-extractable key');
  }
  return crypto.subtle.exportKey('raw', key);
}

// ---------------------------------------------------------------------------
// Yjs update encryption / decryption (per ADR-0011 boundary)
// ---------------------------------------------------------------------------

/**
 * Encrypt a Yjs update (Uint8Array) with AES-256-GCM.
 * Returns IV || ciphertext || auth tag (standard GCM framing).
 */
export async function encryptYjsUpdate(
  update: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    toBufferSource(update)
  );
  const result = new Uint8Array(IV_LENGTH + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), IV_LENGTH);
  return result;
}

/**
 * Decrypt a Yjs update (IV || ciphertext) with AES-256-GCM.
 * GCM authentication tag is verified; throws on tampering or wrong key.
 */
export async function decryptYjsUpdate(
  encrypted: Uint8Array,
  key: CryptoKey
): Promise<Uint8Array> {
  if (encrypted.length < IV_LENGTH) {
    throw new Error(
      `Encrypted update too short: ${encrypted.length} bytes (minimum ${IV_LENGTH})`
    );
  }
  const iv = encrypted.slice(0, IV_LENGTH);
  const ciphertext = encrypted.slice(IV_LENGTH);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new Uint8Array(plaintext);
}

// ---------------------------------------------------------------------------
// Recovery phrase (BIP39, 12-word mnemonic)
// ---------------------------------------------------------------------------

/**
 * Synchronous stub — use generateRecoveryPhraseAsync() instead.
 * WebCrypto SHA-256 is async so BIP39 checksum requires async.
 */
export function generateRecoveryPhrase(): string {
  throw new Error(
    'Use generateRecoveryPhraseAsync() — WebCrypto SHA-256 is async'
  );
}

/**
 * Generate a 12-word BIP39 recovery phrase asynchronously.
 * Uses 128 bits of entropy + 4 bits SHA-256 checksum.
 */
export async function generateRecoveryPhraseAsync(): Promise<string> {
  const entropy = new Uint8Array(ENTROPY_BYTES);
  crypto.getRandomValues(entropy);
  return entropyToMnemonic(entropy);
}

/**
 * Convert BIP39 entropy bytes to a mnemonic phrase.
 */
async function entropyToMnemonic(entropy: Uint8Array): Promise<string> {
  if (entropy.length !== ENTROPY_BYTES) {
    throw new Error(
      `Invalid entropy length: expected ${ENTROPY_BYTES}, got ${entropy.length}`
    );
  }

  // Compute SHA-256 of entropy
  const hash = await crypto.subtle.digest('SHA-256', toBufferSource(entropy));
  const hashBytes = new Uint8Array(hash);

  // Take first byte of hash for checksum (ENTROPY_BITS / 32 = 4 bits)
  const checksumBits = ENTROPY_BITS / 32;
  const checksum = at(hashBytes, 0) >> (8 - checksumBits);

  // Combine entropy + checksum
  const totalBits = ENTROPY_BITS + checksumBits;
  const words: string[] = [];

  for (let i = 0; i < totalBits; i += 11) {
    // Extract 11 bits
    let wordIndex = 0;
    for (let b = 0; b < 11; b++) {
      const globalBit = i + b;
      let bit: number;

      if (globalBit < ENTROPY_BITS) {
        // Entropy bit
        const bytePos = Math.floor(globalBit / 8);
        const bitPos = 7 - (globalBit % 8);
        bit = (at(entropy, bytePos) >> bitPos) & 1;
      } else {
        // Checksum bit
        const checksumBitPos = globalBit - ENTROPY_BITS;
        bit = (checksum >> (checksumBits - 1 - checksumBitPos)) & 1;
      }

      wordIndex = (wordIndex << 1) | bit;
    }

    if (wordIndex < 0 || wordIndex >= BIP39_WORDLIST.length) {
      throw new Error(`Invalid BIP39 word index: ${wordIndex}`);
    }
    words.push(at(BIP39_WORDLIST, wordIndex));
  }

  return words.join(' ');
}

/**
 * Validate that a recovery phrase is structurally correct.
 * Checks word count and BIP39 checksum.
 */
export async function validateRecoveryPhrase(phrase: string): Promise<boolean> {
  const words = phrase.trim().toLowerCase().split(/\s+/);
  if (words.length !== 12) return false;

  // Verify each word is in the wordlist
  const wordlistSet = new Set(BIP39_WORDLIST);
  for (const word of words) {
    if (!wordlistSet.has(word)) return false;
  }

  // Reconstruct entropy and verify checksum
  const totalBits = words.length * 11;
  const checksumBits = totalBits % 32;
  const entropyBits = totalBits - checksumBits;
  const entropyBytes = entropyBits / 8;

  // Build the full bitstream from word indices
  const indices = words.map((w) => BIP39_WORDLIST.indexOf(w));
  const entropy = new Uint8Array(entropyBytes);

  for (let i = 0; i < totalBits; i++) {
    const wordIdx = Math.floor(i / 11);
    const bitInWord = 10 - (i % 11);
    const bit = (at(indices, wordIdx) >> bitInWord) & 1;

    if (i < entropyBits) {
      const bytePos = Math.floor(i / 8);
      const bitPos = 7 - (i % 8);
      at(entropy, bytePos);
      const current = entropy[bytePos];
      if (current !== undefined) {
        entropy[bytePos] = current | (bit << bitPos);
      }
    }
  }

  // Verify checksum
  const reconstructed = await entropyToMnemonic(entropy);
  return reconstructed === words.join(' ');
}

// ---------------------------------------------------------------------------
// Key derivation from recovery phrase → room key
// ---------------------------------------------------------------------------

/**
 * Derive a BIP39 seed (64 bytes) from a mnemonic phrase.
 * Follows BIP-0039: PBKDF2 with "mnemonic" + optional passphrase,
 * 2048 iterations, HMAC-SHA512, 64-byte output.
 */
export async function mnemonicToSeed(
  phrase: string,
  passphrase = ''
): Promise<Uint8Array> {
  const mnemonic = phrase.trim().toLowerCase();
  const salt = `mnemonic${passphrase}`;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toBufferSource(enc.encode(mnemonic)),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const seed = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: toBufferSource(enc.encode(salt)),
      iterations: BIP39_SEED_ITERATIONS,
      hash: 'SHA-512',
    },
    keyMaterial,
    BIP39_SEED_LENGTH * 8
  );

  return new Uint8Array(seed);
}

/**
 * Derive a room key from a BIP39 seed + room-scoped salt.
 * Uses PBKDF2 with 600 000 iterations, HMAC-SHA256, 32-byte output.
 */
export async function deriveRoomKey(
  seed: Uint8Array,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toBufferSource(seed),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBufferSource(salt),
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable — room key must be exportable for recovery
    ['encrypt', 'decrypt']
  );
}

/**
 * Convenience: recovery phrase → room key in one step.
 */
export async function deriveRoomKeyFromPhrase(
  phrase: string,
  salt: Uint8Array,
  passphrase = ''
): Promise<CryptoKey> {
  const seed = await mnemonicToSeed(phrase, passphrase);
  return deriveRoomKey(seed, salt);
}

// ---------------------------------------------------------------------------
// Salt and key material
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically random salt for room key derivation.
 */
export function generateSalt(): Uint8Array {
  const salt = new Uint8Array(SALT_LENGTH);
  crypto.getRandomValues(salt);
  return salt;
}

/**
 * Generate room encryption metadata for a new encrypted room.
 */
export function generateRoomEncryptionMetadata(): RoomEncryptionMetadata {
  const salt = generateSalt();
  return {
    encrypted: true,
    algorithm: 'AES-256-GCM',
    keyDerivation: {
      method: 'PBKDF2',
      iterations: DEFAULT_PBKDF2_ITERATIONS,
      salt: arrayBufferToBase64(salt.buffer as ArrayBuffer),
    },
    ivLength: 12,
  };
}

// ---------------------------------------------------------------------------
// Key wrapping (for exporting/sharing room keys between devices)
// ---------------------------------------------------------------------------

/**
 * Wrap a room key with a wrapping key using AES-GCM.
 * Returns wrapped bytes + IV for later unwrapping.
 */
export async function wrapRoomKey(
  key: CryptoKey,
  wrappingKey: CryptoKey
): Promise<{ wrapped: ArrayBuffer; iv: Uint8Array }> {
  const rawKey = await exportRoomKeyRaw(key);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const wrapped = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    wrappingKey,
    rawKey
  );
  return { wrapped, iv };
}

/**
 * Unwrap a room key with a wrapping key.
 */
export async function unwrapRoomKey(
  wrapped: ArrayBuffer,
  iv: Uint8Array,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const rawKey = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toBufferSource(iv) },
    wrappingKey,
    wrapped
  );
  return importRoomKey(rawKey, true);
}

/**
 * Generate a wrapping key from a passphrase.
 */
export async function generateWrappingKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    toBufferSource(new TextEncoder().encode(passphrase)),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: toBufferSource(salt),
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// ---------------------------------------------------------------------------
// Export material
// ---------------------------------------------------------------------------

/**
 * Build full export material for a room key (recovery phrase + raw key).
 */
export async function buildRoomKeyExportMaterial(
  key: CryptoKey
): Promise<RoomKeyExportMaterial> {
  const rawKey = await exportRoomKeyRaw(key);
  const rawKeyBase64 = arrayBufferToBase64(rawKey);
  return { rawKeyBase64 };
}

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** Convert ArrayBuffer to base64 string (browser-safe). */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(at(bytes, i));
  }
  return btoa(binary);
}

/** Convert base64 string to ArrayBuffer (browser-safe). */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer as ArrayBuffer;
}

/** Convenience: Uint8Array → base64. */
export function uint8ArrayToBase64(arr: Uint8Array): string {
  return arrayBufferToBase64(
    arr.buffer.slice(
      arr.byteOffset,
      arr.byteOffset + arr.byteLength
    ) as ArrayBuffer
  );
}

/** Convenience: base64 → Uint8Array. */
export function base64ToUint8Array(base64: string): Uint8Array {
  return new Uint8Array(base64ToArrayBuffer(base64));
}
