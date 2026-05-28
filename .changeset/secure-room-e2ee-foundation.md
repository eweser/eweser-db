---
"@eweser/db": minor
"@eweser/shared": minor
---

Added secure-room E2EE foundation per ADR-0011. Client-side AES-256-GCM per-Yjs-update encryption with PBKDF2 key derivation from 12-word BIP39 recovery phrases.

@eweser/shared: New types — `RoomEncryptionMetadata`, `RoomCryptoStatus`, `RoomKeyExportMaterial`, `WrappedRoomKey`, `KeyExportFormat`. `ServerRoom` gains non-optional `encryption` field (null for unencrypted).

@eweser/db: New `RoomCrypto` state machine for local lock/unlock. `Room` class gains `isUnlocked`, `unlock()`, `unlockWithRawKey()`, `lock()`, `encryptUpdate()`, `decryptUpdate()`, `exportRawKeyBase64()`. Encryption primitives: `generateRoomKey`, `encryptYjsUpdate`, `decryptYjsUpdate`, `generateRecoveryPhraseAsync`, `validateRecoveryPhrase`, `deriveRoomKeyFromPhrase`, key wrapping/unwrapping helpers. All keys are WebCrypto handles — never serialized to logs, Yjs fields, localStorage, or server payloads.