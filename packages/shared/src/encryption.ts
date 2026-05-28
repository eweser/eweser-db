/**
 * Purpose: Shared encryption types for secure-room E2EE.
 * Exports: RoomEncryptionMetadata, room-level crypto contracts.
 * Touches: @eweser/db SDK, auth server room metadata, sync relay.
 * Read before editing: docs/ai/adr/0011-secure-room-e2ee.md.
 */

/** Room-level encryption metadata stored in the room record. */
export interface RoomEncryptionMetadata {
  /** Set to true when the room is encrypted. */
  encrypted: true;
  /** Cipher used for per-update encryption. */
  algorithm: 'AES-256-GCM';
  /** Parameters for deriving the room key from a recovery phrase. */
  keyDerivation: {
    /** Key derivation function. */
    method: 'PBKDF2';
    /** Number of PBKDF2 iterations (recommended: 600 000+). */
    iterations: number;
    /** Base64-encoded salt, scoped to the room ID. */
    salt: string;
  };
  /** IV length in bytes for AES-GCM (always 12). */
  ivLength: 12;
}

/** Union of supported encryption export formats. */
export type KeyExportFormat = 'raw' | 'jwk';

/** Serialized wrapped key for sharing between devices. */
export interface WrappedRoomKey {
  /** Algorithm used for wrapping. */
  algorithm: 'AES-KW' | 'AES-GCM';
  /** Base64-encoded wrapped key bytes. */
  wrappedKey: string;
  /** Base64-encoded wrapping IV (if needed by the algorithm). */
  iv?: string;
  /** Parameters needed to derive the wrapping key. */
  wrappingKeyParams?: {
    method: 'PBKDF2';
    iterations: number;
    salt: string;
  };
}

/** Local unlock state — never serialized, held in memory only. */
export type RoomCryptoStatus = 'locked' | 'unlocked' | 'no-encryption';

/** Material a user can export to recover or share a room key. */
export interface RoomKeyExportMaterial {
  /** 12-word BIP39 recovery phrase (human-readable). */
  recoveryPhrase?: string;
  /** Base64-encoded raw key bytes (programmatic transfer). */
  rawKeyBase64?: string;
  /** Alternative wrapped-key payload for device sharing. */
  wrappedKey?: WrappedRoomKey;
}
