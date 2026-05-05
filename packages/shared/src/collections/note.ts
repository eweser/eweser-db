import type { DocumentBase } from './documentBase.js';

export type NoteVaultSyncMetadata = {
  /** Stable identity for a file-backed note, independent from mutable sourcePath. */
  sourceId?: string;
  /** Source path observed during the last successful vault sync. */
  sourcePath?: string;
  /** Filesystem mtime in milliseconds from the last successful file read. */
  sourceMtimeMs?: number;
  /** SHA-256 hash of the last file content synced from disk. */
  lastFileHash?: string;
  /** SHA-256 hash of the last Eweser note content materialized to disk. */
  lastEweserHash?: string;
  /** ISO timestamp for the last successful vault sync operation. */
  lastSyncedAt?: string;
};

export type NoteBase = {
  text: string;
  flashcardRefs?: string[];
  /** Relative path within the vault, e.g. 'Folder A/Subfolder/My Note.md' */
  sourcePath?: string;
  /** Vault name for multi-vault support */
  sourceVault?: string;
  /** Parsed YAML frontmatter properties */
  frontmatter?: Record<string, unknown>;
  /** Aliases from frontmatter, indexed for wiki-link resolution */
  aliases?: string[];
  /** Tags extracted from frontmatter + inline #tags */
  tags?: string[];
  /** IDs of folders this note belongs to */
  folderIds?: string[];
  /** Filesystem bridge metadata for Obsidian-compatible vault sync. */
  vaultSync?: NoteVaultSyncMetadata;
};

export type Note = DocumentBase & NoteBase;
