/**
 * Tests for secure-room E2EE crypto primitives.
 * Replaces and extends encryption.spike.test.ts from ADR-0011 prototyping.
 *
 * Coverage:
 *  - AES-256-GCM encrypt/decrypt round trip with real Y.Doc
 *  - Tamper detection (GCM auth tag)
 *  - Key separation (wrong key fails)
 *  - Imported raw key round trip
 *  - Incremental Yjs updates across encryption boundary
 *  - Empty Y.Doc handling
 *  - BIP39 recovery phrase generation, validation, and derivation
 *  - salt generation
 *  - Key wrapping/unwrapping
 *  - Serialization helpers (base64)
 *  - Locked-client behavior (missing key → error)
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import {
  generateRoomKey,
  importRoomKey,
  exportRoomKeyRaw,
  encryptYjsUpdate,
  decryptYjsUpdate,
  generateRecoveryPhraseAsync,
  validateRecoveryPhrase,
  mnemonicToSeed,
  deriveRoomKeyFromPhrase,
  generateSalt,
  generateRoomEncryptionMetadata,
  wrapRoomKey,
  unwrapRoomKey,
  generateWrappingKeyFromPassphrase,
  arrayBufferToBase64,
  base64ToArrayBuffer,
  uint8ArrayToBase64,
  base64ToUint8Array,
  IV_LENGTH,
  DEFAULT_PBKDF2_ITERATIONS,
} from './encryption.js';

// ---------------------------------------------------------------------------
// AES-256-GCM Yjs update round trip (from ADR-0011 spike)
// ---------------------------------------------------------------------------

describe('Yjs update-level AES-256-GCM round trip', () => {
  it('encrypts and decrypts a single Yjs update', async () => {
    const doc = new Y.Doc();
    const map = doc.getMap('test');
    map.set('hello', 'world');
    map.set('count', 42);

    const update = Y.encodeStateAsUpdate(doc);
    const key = await generateRoomKey();
    const encrypted = await encryptYjsUpdate(update, key);

    // Encrypted blob differs from plaintext
    expect(encrypted).not.toEqual(update);
    expect(encrypted.length).toBeGreaterThan(update.length); // IV + auth tag overhead

    const decrypted = await decryptYjsUpdate(encrypted, key);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    const map2 = doc2.getMap('test');
    expect(map2.get('hello')).toBe('world');
    expect(map2.get('count')).toBe(42);
  });

  it('tampered ciphertext is detected', async () => {
    const doc = new Y.Doc();
    doc.getMap('test').set('secret', 'value');
    const update = Y.encodeStateAsUpdate(doc);

    const key = await generateRoomKey();
    const encrypted = await encryptYjsUpdate(update, key);

    // Tamper: flip a byte in the ciphertext (after the IV)
    const tampered = new Uint8Array(encrypted);
    const tamperIdx = IV_LENGTH + 1;

    if (tampered[tamperIdx] !== undefined) {
      tampered[tamperIdx] ^= 0xff;
    }

    await expect(decryptYjsUpdate(tampered, key)).rejects.toThrow();
  });

  it('different keys produce incompatible ciphertext', async () => {
    const doc = new Y.Doc();
    doc.getMap('test').set('key', 'value');
    const update = Y.encodeStateAsUpdate(doc);

    const key1 = await generateRoomKey();
    const key2 = await generateRoomKey();

    const encrypted = await encryptYjsUpdate(update, key1);
    await expect(decryptYjsUpdate(encrypted, key2)).rejects.toThrow();
  });

  it('imported raw key round trips correctly', async () => {
    const doc = new Y.Doc();
    doc.getMap('test').set('payload', 'import-test');
    const update = Y.encodeStateAsUpdate(doc);

    const originalKey = await generateRoomKey();
    const rawKey = await exportRoomKeyRaw(originalKey);
    const importedKey = await importRoomKey(rawKey);

    const encrypted = await encryptYjsUpdate(update, originalKey);
    const decrypted = await decryptYjsUpdate(encrypted, importedKey);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    expect(doc2.getMap('test').get('payload')).toBe('import-test');
  });

  it('incremental updates work across the encryption boundary', async () => {
    const doc = new Y.Doc();
    const text = doc.getText('notes');

    text.insert(0, 'Hello');
    const update1 = Y.encodeStateAsUpdate(doc);

    text.insert(5, ' World');
    const update2 = Y.encodeStateAsUpdate(doc);

    const key = await generateRoomKey();
    const enc1 = await encryptYjsUpdate(update1, key);
    const enc2 = await encryptYjsUpdate(update2, key);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, await decryptYjsUpdate(enc1, key));
    Y.applyUpdate(doc2, await decryptYjsUpdate(enc2, key));

    expect(doc2.getText('notes').toString()).toBe('Hello World');
  });

  it('handles an empty Y.Doc update', async () => {
    const doc = new Y.Doc();
    const update = Y.encodeStateAsUpdate(doc);

    const key = await generateRoomKey();
    const encrypted = await encryptYjsUpdate(update, key);
    const decrypted = await decryptYjsUpdate(encrypted, key);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    expect(doc2.getMap('test').size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Locked-client behavior (key absence)
// ---------------------------------------------------------------------------

describe('locked-client behavior', () => {
  it('decryptYjsUpdate throws with no key', async () => {
    const doc = new Y.Doc();
    doc.getMap('test').set('a', 1);
    const update = Y.encodeStateAsUpdate(doc);

    const key = await generateRoomKey();
    const encrypted = await encryptYjsUpdate(update, key);

    // Try to decrypt with a fresh (wrong) key — simulates locked state
    const wrongKey = await generateRoomKey();
    await expect(decryptYjsUpdate(encrypted, wrongKey)).rejects.toThrow();
  });

  it('importRoomKey rejects wrong-length raw key', async () => {
    const shortKey = new Uint8Array(16); // 16 bytes, not 32
    await expect(importRoomKey(shortKey.buffer as ArrayBuffer)).rejects.toThrow(
      'Invalid room key length'
    );
  });

  it('exportRoomKeyRaw throws on non-extractable key', async () => {
    const key = await generateRoomKey();
    const rawKey = await exportRoomKeyRaw(key);
    const nonExtractable = await importRoomKey(rawKey, false);
    await expect(exportRoomKeyRaw(nonExtractable)).rejects.toThrow(
      'non-extractable'
    );
  });

  it('decryptYjsUpdate throws on too-short ciphertext', async () => {
    const short = new Uint8Array(5);
    const key = await generateRoomKey();
    await expect(decryptYjsUpdate(short, key)).rejects.toThrow('too short');
  });
});

// ---------------------------------------------------------------------------
// Recovery phrase (BIP39, 12 words)
// ---------------------------------------------------------------------------

describe('BIP39 recovery phrase', () => {
  it('generates a 12-word phrase', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const words = phrase.split(' ');
    expect(words.length).toBe(12);
    // Each word should be non-empty
    for (const word of words) {
      expect(word.length).toBeGreaterThan(0);
    }
  });

  it('generated phrase passes validation', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const valid = await validateRecoveryPhrase(phrase);
    expect(valid).toBe(true);
  });

  it('each generation produces a unique phrase', async () => {
    const p1 = await generateRecoveryPhraseAsync();
    const p2 = await generateRecoveryPhraseAsync();
    expect(p1).not.toEqual(p2);
  });

  it('rejects wrong number of words', async () => {
    const bad = 'abandon ability able about above angle angry';
    expect(await validateRecoveryPhrase(bad)).toBe(false);
  });

  it('rejects invalid words', async () => {
    // 12 words but last one is not in the BIP39 wordlist
    const bad =
      'abandon ability able about above angle angry answer any apple april NOTREAL';
    expect(await validateRecoveryPhrase(bad)).toBe(false);
  });

  it('validates a known-good phrase case-insensitively', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const upper = phrase.toUpperCase();
    expect(await validateRecoveryPhrase(upper)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Key derivation from recovery phrase
// ---------------------------------------------------------------------------

describe('key derivation from recovery phrase', () => {
  it('derives a deterministic room key from a phrase and salt', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const salt = generateSalt();

    const key1 = await deriveRoomKeyFromPhrase(phrase, salt);
    const key2 = await deriveRoomKeyFromPhrase(phrase, salt);

    // Same phrase + same salt = same key (deterministic)
    const raw1 = await exportRoomKeyRaw(key1);
    const raw2 = await exportRoomKeyRaw(key2);
    expect(uint8ArrayToBase64(new Uint8Array(raw1))).toBe(
      uint8ArrayToBase64(new Uint8Array(raw2))
    );
  });

  it('different salts produce different keys', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const salt1 = generateSalt();
    const salt2 = generateSalt();

    const key1 = await deriveRoomKeyFromPhrase(phrase, salt1);
    const key2 = await deriveRoomKeyFromPhrase(phrase, salt2);

    const raw1 = await exportRoomKeyRaw(key1);
    const raw2 = await exportRoomKeyRaw(key2);
    expect(uint8ArrayToBase64(new Uint8Array(raw1))).not.toBe(
      uint8ArrayToBase64(new Uint8Array(raw2))
    );
  });

  it('different phrases produce different keys', async () => {
    const phrase1 = await generateRecoveryPhraseAsync();
    const phrase2 = await generateRecoveryPhraseAsync();
    const salt = generateSalt();

    const key1 = await deriveRoomKeyFromPhrase(phrase1, salt);
    const key2 = await deriveRoomKeyFromPhrase(phrase2, salt);

    const raw1 = await exportRoomKeyRaw(key1);
    const raw2 = await exportRoomKeyRaw(key2);
    expect(uint8ArrayToBase64(new Uint8Array(raw1))).not.toBe(
      uint8ArrayToBase64(new Uint8Array(raw2))
    );
  });

  it('mnemonicToSeed returns 64 bytes', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const seed = await mnemonicToSeed(phrase);
    expect(seed.length).toBe(64);
  });

  it('mnemonicToSeed is deterministic', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const seed1 = await mnemonicToSeed(phrase);
    const seed2 = await mnemonicToSeed(phrase);
    expect(uint8ArrayToBase64(seed1)).toBe(uint8ArrayToBase64(seed2));
  });

  it('derived key encrypts and decrypts Yjs updates', async () => {
    const phrase = await generateRecoveryPhraseAsync();
    const salt = generateSalt();
    const key = await deriveRoomKeyFromPhrase(phrase, salt);

    const doc = new Y.Doc();
    doc.getMap('test').set('derived', 'works');
    const update = Y.encodeStateAsUpdate(doc);

    const encrypted = await encryptYjsUpdate(update, key);
    const decrypted = await decryptYjsUpdate(encrypted, key);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    expect(doc2.getMap('test').get('derived')).toBe('works');
  });
});

// ---------------------------------------------------------------------------
// Salt and metadata generation
// ---------------------------------------------------------------------------

describe('salt and metadata', () => {
  it('generateSalt returns 32 bytes', () => {
    const salt = generateSalt();
    expect(salt.length).toBe(32);
  });

  it('generateSalt is unique each call', () => {
    const s1 = generateSalt();
    const s2 = generateSalt();
    expect(uint8ArrayToBase64(s1)).not.toBe(uint8ArrayToBase64(s2));
  });

  it('generateRoomEncryptionMetadata returns correct shape', () => {
    const meta = generateRoomEncryptionMetadata();
    expect(meta.encrypted).toBe(true);
    expect(meta.algorithm).toBe('AES-256-GCM');
    expect(meta.ivLength).toBe(12);
    expect(meta.keyDerivation.method).toBe('PBKDF2');
    expect(meta.keyDerivation.iterations).toBe(DEFAULT_PBKDF2_ITERATIONS);
    expect(meta.keyDerivation.salt).toBeTruthy();
    // Salt should be valid base64
    const saltBytes = base64ToUint8Array(meta.keyDerivation.salt);
    expect(saltBytes.length).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Key wrapping and unwrapping
// ---------------------------------------------------------------------------

describe('key wrapping', () => {
  it('wraps and unwraps a room key', async () => {
    const roomKey = await generateRoomKey();
    const wrappingKey = await generateRoomKey();
    const { wrapped, iv } = await wrapRoomKey(roomKey, wrappingKey);
    const unwrapped = await unwrapRoomKey(wrapped, iv, wrappingKey);

    // Verify unwrapped key works
    const doc = new Y.Doc();
    doc.getMap('test').set('wrapped', 'roundtrip');
    const update = Y.encodeStateAsUpdate(doc);

    const encrypted = await encryptYjsUpdate(update, unwrapped);
    const decrypted = await decryptYjsUpdate(encrypted, roomKey);
    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    expect(doc2.getMap('test').get('wrapped')).toBe('roundtrip');
  });

  it('wrapping key from passphrase works', async () => {
    const roomKey = await generateRoomKey();
    const salt = generateSalt();
    const wrappingKey = await generateWrappingKeyFromPassphrase(
      'my-secret-passphrase',
      salt
    );
    const { wrapped, iv } = await wrapRoomKey(roomKey, wrappingKey);
    const unwrapped = await unwrapRoomKey(wrapped, iv, wrappingKey);

    // Verify round trip
    const raw1 = await exportRoomKeyRaw(roomKey);
    const raw2 = await exportRoomKeyRaw(unwrapped);
    expect(uint8ArrayToBase64(new Uint8Array(raw1))).toBe(
      uint8ArrayToBase64(new Uint8Array(raw2))
    );
  });
});

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

describe('serialization helpers', () => {
  it('arrayBufferToBase64 round trips', () => {
    const original = new Uint8Array([0, 1, 2, 255, 128, 64, 32]);
    const b64 = arrayBufferToBase64(original.buffer as ArrayBuffer);
    const restored = base64ToArrayBuffer(b64);
    expect(new Uint8Array(restored)).toEqual(original);
  });

  it('uint8ArrayToBase64 round trips', () => {
    const original = new Uint8Array([10, 20, 30, 40, 50]);
    const b64 = uint8ArrayToBase64(original);
    const restored = base64ToUint8Array(b64);
    expect(restored).toEqual(original);
  });

  it('base64ToArrayBuffer handles empty string', () => {
    const buf = base64ToArrayBuffer('');
    expect(buf.byteLength).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// CRDT-safe writes (Yjs structural integrity)
// ---------------------------------------------------------------------------

describe('CRDT-safe writes', () => {
  it('Yjs merge works after encrypt/decrypt cycle', async () => {
    // Simulate two concurrent edits to the same document
    // Both encrypted, sent via relay, decrypted, then merged via Yjs

    const key = await generateRoomKey();

    // Client A: creates initial state
    const docA = new Y.Doc();
    const textA = docA.getText('collab');
    textA.insert(0, 'AB');

    // Client B: concurrent edit (starts from same base)
    const docB = new Y.Doc();
    const textB = docB.getText('collab');
    textB.insert(0, 'AB');
    textB.insert(1, 'X'); // "AXB"

    // Client A also makes a concurrent edit
    textA.insert(1, 'Y'); // "AYB"

    // Encrypt both concurrent updates
    const updateA = Y.encodeStateAsUpdate(docA);
    const updateB = Y.encodeStateAsUpdate(docB);

    const encA = await encryptYjsUpdate(updateA, key);
    const encB = await encryptYjsUpdate(updateB, key);

    // Decrypt and merge on a third client
    const docC = new Y.Doc();
    Y.applyUpdate(docC, await decryptYjsUpdate(encA, key));
    Y.applyUpdate(docC, await decryptYjsUpdate(encB, key));

    // Yjs CRDT merge — both characters should be present
    const result = docC.getText('collab').toString();
    expect(result).toContain('A');
    expect(result).toContain('B');
    expect(result).toContain('X');
    expect(result).toContain('Y');
  });

  it('large document round trip preserves all fields', async () => {
    const doc = new Y.Doc();
    const map = doc.getMap('large');

    // Add 100 key-value pairs
    for (let i = 0; i < 100; i++) {
      map.set(`key${i}`, `value${i}`);
    }

    const update = Y.encodeStateAsUpdate(doc);
    const key = await generateRoomKey();
    const encrypted = await encryptYjsUpdate(update, key);
    const decrypted = await decryptYjsUpdate(encrypted, key);

    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    const map2 = doc2.getMap('large');

    for (let i = 0; i < 100; i++) {
      expect(map2.get(`key${i}`)).toBe(`value${i}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Migration guardrail: plaintext detection
// ---------------------------------------------------------------------------

describe('migration guardrails', () => {
  it('plaintext Yjs update is rejected by decryptYjsUpdate', async () => {
    // If someone accidentally sends a plaintext update through
    // the decrypt path, GCM auth tag validation should catch it.
    const doc = new Y.Doc();
    doc.getMap('test').set('plain', 'text');
    const update = Y.encodeStateAsUpdate(doc);

    const key = await generateRoomKey();

    // Plaintext update is not valid ciphertext — should throw
    await expect(decryptYjsUpdate(update, key)).rejects.toThrow();
  });

  it('importRoomKey validates length early', async () => {
    // Guards against accidentally importing wrong material
    const tooLong = new Uint8Array(64); // 64 bytes, not 32
    await expect(importRoomKey(tooLong.buffer as ArrayBuffer)).rejects.toThrow(
      'Invalid room key length'
    );
  });
});
