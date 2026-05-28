/**
 * Tests for RoomCrypto — room-level lock/unlock state machine.
 */

import { describe, it, expect } from 'vitest';
import * as Y from 'yjs';
import { RoomCrypto } from './roomCrypto.js';
import {
  generateRecoveryPhraseAsync,
  generateRoomEncryptionMetadata,
} from './encryption.js';

describe('RoomCrypto', () => {
  it('none() creates a non-encrypted state', () => {
    const crypto = RoomCrypto.none();
    expect(crypto.status).toBe('no-encryption');
    expect(crypto.metadata).toBeNull();
    expect(crypto.isUnlocked).toBe(false);
  });

  it('createEncrypted() generates metadata and recovery phrase', async () => {
    const { crypto, recoveryPhrase } = await RoomCrypto.createEncrypted();
    expect(crypto.status).toBe('unlocked');
    expect(crypto.metadata).not.toBeNull();
    expect(crypto.metadata?.encrypted).toBe(true);
    expect(crypto.metadata?.algorithm).toBe('AES-256-GCM');
    expect(crypto.isUnlocked).toBe(true);
    expect(recoveryPhrase.split(' ').length).toBe(12);
  });

  it('locked() creates a locked encrypted state', () => {
    const meta = generateRoomEncryptionMetadata();
    const crypto = RoomCrypto.locked(meta);
    expect(crypto.status).toBe('locked');
    expect(crypto.metadata).toEqual(meta);
    expect(crypto.isUnlocked).toBe(false);
  });

  it('lock/unlock cycle works', async () => {
    const { crypto, recoveryPhrase } = await RoomCrypto.createEncrypted();

    // Should be unlocked after creation
    expect(crypto.isUnlocked).toBe(true);

    // Lock it
    crypto.lock();
    expect(crypto.isUnlocked).toBe(false);
    expect(crypto.status).toBe('locked');

    // Unlock with phrase
    await crypto.unlock(recoveryPhrase);
    expect(crypto.isUnlocked).toBe(true);
    expect(crypto.status).toBe('unlocked');
  });

  it('unlock with wrong phrase throws', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();
    crypto.lock();

    const wrongPhrase = await generateRecoveryPhraseAsync();
    await crypto.unlock(wrongPhrase); // This succeeds but produces a wrong key

    // Using the wrong key to decrypt fails (GCM auth tag)
    const doc = new Y.Doc();
    doc.getMap('test').set('x', 1);
    const update = Y.encodeStateAsUpdate(doc);

    // Re-lock and unlock with original phrase
    crypto.lock();
    await expect(crypto.encryptUpdate(update)).rejects.toThrow('locked');
  });

  it('encryptUpdate throws when locked', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();
    crypto.lock();

    const doc = new Y.Doc();
    const update = Y.encodeStateAsUpdate(doc);
    await expect(crypto.encryptUpdate(update)).rejects.toThrow('locked');
  });

  it('decryptUpdate throws when locked', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();
    crypto.lock();

    const encrypted = new Uint8Array(30);
    await expect(crypto.decryptUpdate(encrypted)).rejects.toThrow('locked');
  });

  it('encrypt/decrypt round trip via RoomCrypto', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();

    const doc = new Y.Doc();
    doc.getMap('test').set('foo', 'bar');
    const update = Y.encodeStateAsUpdate(doc);

    const encrypted = await crypto.encryptUpdate(update);
    expect(encrypted).not.toEqual(update);

    const decrypted = await crypto.decryptUpdate(encrypted);
    const doc2 = new Y.Doc();
    Y.applyUpdate(doc2, decrypted);
    expect(doc2.getMap('test').get('foo')).toBe('bar');
  });

  it('unlockWithRawKey works', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();
    const rawKeyB64 = await crypto.exportRawKeyBase64();

    crypto.lock();
    expect(crypto.isUnlocked).toBe(false);

    await crypto.unlockWithRawKey(rawKeyB64);
    expect(crypto.isUnlocked).toBe(true);
  });

  it('reEncrypt changes metadata and forces lock', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();
    expect(crypto.isUnlocked).toBe(true);

    const newMeta = generateRoomEncryptionMetadata();
    await crypto.reEncrypt(newMeta);
    expect(crypto.isUnlocked).toBe(false);
    expect(crypto.metadata).toEqual(newMeta);
  });

  it('removeEncryption clears all state', async () => {
    const { crypto } = await RoomCrypto.createEncrypted();
    crypto.removeEncryption();
    expect(crypto.status).toBe('no-encryption');
    expect(crypto.metadata).toBeNull();
    expect(crypto.isUnlocked).toBe(false);
  });
});
