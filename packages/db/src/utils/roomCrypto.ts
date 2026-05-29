/**
 * Purpose: Room-level encryption lock/unlock state management.
 * Exports: RoomCrypto — state holder that tracks whether a room's key is locally available.
 * Touches: @eweser/shared encryption types, WebCrypto CryptoKey handles.
 * Read before editing: docs/ai/adr/0011-secure-room-e2ee.md.
 */

import type { RoomEncryptionMetadata, RoomCryptoStatus } from '@eweser/shared';
import {
  deriveRoomKeyFromPhrase,
  importRoomKey,
  exportRoomKeyRaw,
  encryptYjsUpdate,
  decryptYjsUpdate,
  generateRecoveryPhraseAsync,
  generateRoomEncryptionMetadata,
  base64ToUint8Array,
  uint8ArrayToBase64,
} from './encryption.js';

// ---------------------------------------------------------------------------
// RoomCrypto
// ---------------------------------------------------------------------------

/**
 * Client-side room encryption state.
 *
 * Lifecycle:
 *   1. Room created with encryption → status 'locked', no key.
 *   2. User provides recovery phrase → unlock → status 'unlocked', key in memory.
 *   3. User locks → status 'locked', key dropped.
 *   4. Non-encrypted room → status 'no-encryption', no key.
 *
 * The key is a WebCrypto CryptoKey — it is never serialized.
 */
export class RoomCrypto {
  status: RoomCryptoStatus;
  /** Metadata for encrypted rooms (null if not encrypted). */
  metadata: RoomEncryptionMetadata | null;
  /** The room key — only set when status is 'unlocked'. */
  private _roomKey: CryptoKey | null = null;

  private constructor(
    status: RoomCryptoStatus,
    metadata: RoomEncryptionMetadata | null,
    key: CryptoKey | null
  ) {
    this.status = status;
    this.metadata = metadata;
    this._roomKey = key;
  }

  // -----------------------------------------------------------------------
  // Factory methods
  // -----------------------------------------------------------------------

  /** Create a RoomCrypto for a non-encrypted room. */
  static none(): RoomCrypto {
    return new RoomCrypto('no-encryption', null, null);
  }

  /**
   * Create a new encrypted room crypto state.
   * Generates metadata (salt, algorithm) and returns in locked state.
   * The caller must generate a recovery phrase separately and store it.
   */
  static async createEncrypted(): Promise<{
    crypto: RoomCrypto;
    recoveryPhrase: string;
  }> {
    const metadata = generateRoomEncryptionMetadata();
    const phrase = await generateRecoveryPhraseAsync();
    // Derive the key but keep it stored (the room starts unlocked locally
    // during creation so the user can write initial data).
    const salt = base64ToUint8Array(metadata.keyDerivation.salt);
    const key = await deriveRoomKeyFromPhrase(phrase, salt);
    return {
      crypto: new RoomCrypto('unlocked', metadata, key),
      recoveryPhrase: phrase,
    };
  }

  /**
   * Create RoomCrypto for an existing encrypted room (locked).
   * The metadata comes from the server room record.
   */
  static locked(metadata: RoomEncryptionMetadata): RoomCrypto {
    return new RoomCrypto('locked', metadata, null);
  }

  // -----------------------------------------------------------------------
  // Lock / unlock
  // -----------------------------------------------------------------------

  /** Is the room key currently available? */
  get isUnlocked(): boolean {
    return this.status === 'unlocked' && this._roomKey !== null;
  }

  /** Get the room key. Throws if locked. */
  get roomKey(): CryptoKey {
    if (!this.isUnlocked || !this._roomKey) {
      throw new Error(
        `Room is ${this.status}. Call unlock() with a recovery phrase first.`
      );
    }
    return this._roomKey;
  }

  /**
   * Unlock the room using a recovery phrase.
   * The key is derived in memory and never persisted.
   */
  async unlock(phrase: string): Promise<void> {
    if (!this.metadata) {
      throw new Error('Room is not encrypted');
    }
    if (this.status === 'unlocked') {
      return; // already unlocked
    }
    const salt = base64ToUint8Array(this.metadata.keyDerivation.salt);
    this._roomKey = await deriveRoomKeyFromPhrase(phrase, salt);
    this.status = 'unlocked';
  }

  /**
   * Unlock using an imported raw key (e.g., from a key file export).
   */
  async unlockWithRawKey(rawKeyBase64: string): Promise<void> {
    if (!this.metadata) {
      throw new Error('Room is not encrypted');
    }
    const rawKey = base64ToUint8Array(rawKeyBase64);
    this._roomKey = await importRoomKey(rawKey.buffer as ArrayBuffer, true);
    this.status = 'unlocked';
  }

  /** Lock the room — drops the key from memory. No-op for non-encrypted rooms. */
  lock(): void {
    if (this.status === 'no-encryption') return;
    this._roomKey = null;
    this.status = 'locked';
  }

  /** Change encryption (for migration: plaintext → encrypted or vice versa). */
  async reEncrypt(metadata: RoomEncryptionMetadata): Promise<void> {
    this.metadata = metadata;
    // Force lock so the user must re-authenticate with the new key material
    this.lock();
  }

  /** Remove encryption entirely (secure → plaintext migration). */
  removeEncryption(): void {
    this.metadata = null;
    this._roomKey = null;
    this.status = 'no-encryption';
  }

  // -----------------------------------------------------------------------
  // Yjs update encryption / decryption — the approved boundary
  // -----------------------------------------------------------------------

  /**
   * Encrypt a Yjs update for this room.
   * Throws if room is locked (key unavailable).
   */
  async encryptUpdate(update: Uint8Array): Promise<Uint8Array> {
    if (!this.isUnlocked) {
      throw new Error(
        `Cannot encrypt: room is ${this.status}. Call unlock() first.`
      );
    }
    const key = this._roomKey;
    if (!key) throw new Error('Room key not available');
    return encryptYjsUpdate(update, key);
  }

  /**
   * Decrypt a Yjs update for this room.
   * Throws if room is locked (key unavailable).
   */
  async decryptUpdate(encrypted: Uint8Array): Promise<Uint8Array> {
    if (!this.isUnlocked) {
      throw new Error(
        `Cannot decrypt: room is ${this.status}. Call unlock() first.`
      );
    }
    const key = this._roomKey;
    if (!key) throw new Error('Room key not available');
    return decryptYjsUpdate(encrypted, key);
  }

  // -----------------------------------------------------------------------
  // Export material
  // -----------------------------------------------------------------------

  /** Export raw key as base64 (for key file export). Throws if locked. */
  async exportRawKeyBase64(): Promise<string> {
    if (!this.isUnlocked) {
      throw new Error('Cannot export: room is locked.');
    }
    const key = this._roomKey;
    if (!key) throw new Error('Room key not available');
    const raw = await exportRoomKeyRaw(key);
    return uint8ArrayToBase64(new Uint8Array(raw));
  }
}
