import type { DocumentBase } from './documentBase.js';

export type FileAttachmentLocalAvailability =
  | 'available'
  | 'missing'
  | 'unknown';

export type FileAttachmentBase = {
  /** Stable base/workspace identifier that groups notes and files. */
  baseId: string;
  /** Relative path inside the source vault or mounted base. */
  sourcePath: string;
  /** Display filename, usually the basename of sourcePath. */
  filename: string;
  /** MIME type inferred or provided by the source filesystem/storage layer. */
  mimeType: string;
  /** File size in bytes. */
  size: number;
  /** SHA-256 content hash used for identity, conflict checks, and materialization. */
  contentHash: string;
  /** Optional vault/display name for import and diagnostics. */
  sourceVault?: string;
  /** Eweser refs for notes that mention or embed this file. */
  parentNoteRefs?: string[];
  /** Whether this device currently has local bytes for the attachment. */
  localAvailability?: FileAttachmentLocalAvailability;
  /** Device-local path when available; do not treat as canonical synced data. */
  localPath?: string;
  /** Future remote object key for S3-compatible storage. */
  remoteObjectKey?: string;
  /** Future provider profile id; credentials must not live in this document. */
  remoteProviderProfileId?: string;
};

export type FileAttachment = DocumentBase & FileAttachmentBase;
