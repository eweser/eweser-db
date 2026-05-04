#!/usr/bin/env node
/**
 * Purpose: Obsidian vault import manifest CLI and parser.
 * Exports: import types, generateNoteId, processNoteFile, processVaultFile,
 * and import helpers.
 * Touches: User markdown, frontmatter, tags, wiki links, attachments,
 * Canvas/Bases files, and manifest inventory metadata.
 * Read before editing: packages/ewe-note/src/INDEX.md.
 */
/* eslint-disable no-console -- CLI tool: console is the correct output mechanism */

import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import {
  parseFrontmatter,
  extractTags,
  extractWikiLinks,
} from '@eweser/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportedNote {
  /** Stable ID derived from sourcePath — deterministic for idempotent re-import */
  _id: string;
  text: string;
  sourcePath: string;
  sourceVault: string;
  frontmatter: Record<string, unknown>;
  aliases: string[];
  tags: string[];
  wikiLinks: Array<{
    target: string;
    heading?: string;
    alias?: string;
    isEmbed: boolean;
  }>;
  /** Attachment file names referenced in this note */
  attachmentRefs: string[];
}

export type VaultFileCategory =
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'canvas'
  | 'base'
  | 'binary';

export interface ImportedVaultFile {
  /** Relative path within the vault */
  sourcePath: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type guessed from extension */
  mimeType: string;
  /** Broad file family for import/export routing */
  fileCategory: VaultFileCategory;
  /** SHA-256 content hash for round-trip verification */
  contentHash: string;
  /** Absolute source path used for byte-for-byte export when available */
  copySourcePath?: string;
  /** Optional inline bytes for manifests that embed file content */
  contentBase64?: string;
}

export type ImportedAttachment = ImportedVaultFile;

export interface VaultImportManifest {
  vaultName: string;
  vaultPath: string;
  importedAt: string;
  notes: ImportedNote[];
  /** Backward-compatible subset for attachment-oriented consumers */
  attachments: ImportedAttachment[];
  /** Full preserved vault inventory for non-note files */
  files: ImportedVaultFile[];
  skippedPaths: string[];
}

interface VaultFileSpec {
  mimeType: string;
  fileCategory: VaultFileCategory;
}

interface ScanDirectoryResult {
  mdFiles: string[];
  preservedFiles: string[];
  skippedPaths: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);
const NOTE_EXTENSION = '.md';

const VAULT_FILE_SPECS: Record<string, VaultFileSpec> = {
  '.png': { mimeType: 'image/png', fileCategory: 'image' },
  '.jpg': { mimeType: 'image/jpeg', fileCategory: 'image' },
  '.jpeg': { mimeType: 'image/jpeg', fileCategory: 'image' },
  '.gif': { mimeType: 'image/gif', fileCategory: 'image' },
  '.webp': { mimeType: 'image/webp', fileCategory: 'image' },
  '.svg': { mimeType: 'image/svg+xml', fileCategory: 'image' },
  '.avif': { mimeType: 'image/avif', fileCategory: 'image' },
  '.bmp': { mimeType: 'image/bmp', fileCategory: 'image' },
  '.pdf': { mimeType: 'application/pdf', fileCategory: 'document' },
  '.mp3': { mimeType: 'audio/mpeg', fileCategory: 'audio' },
  '.wav': { mimeType: 'audio/wav', fileCategory: 'audio' },
  '.ogg': { mimeType: 'audio/ogg', fileCategory: 'audio' },
  '.flac': { mimeType: 'audio/flac', fileCategory: 'audio' },
  '.m4a': { mimeType: 'audio/mp4', fileCategory: 'audio' },
  '.mp4': { mimeType: 'video/mp4', fileCategory: 'video' },
  '.webm': { mimeType: 'video/webm', fileCategory: 'video' },
  '.ogv': { mimeType: 'video/ogg', fileCategory: 'video' },
  '.3gp': { mimeType: 'video/3gpp', fileCategory: 'video' },
  '.mkv': { mimeType: 'video/x-matroska', fileCategory: 'video' },
  '.mov': { mimeType: 'video/quicktime', fileCategory: 'video' },
  '.canvas': { mimeType: 'application/json', fileCategory: 'canvas' },
  '.base': { mimeType: 'text/yaml', fileCategory: 'base' },
};

const ATTACHMENT_CATEGORIES = new Set<VaultFileCategory>([
  'image',
  'audio',
  'video',
  'document',
]);

const ATTACHMENT_EXTENSIONS = new Set(
  Object.entries(VAULT_FILE_SPECS)
    .filter(([, spec]) => ATTACHMENT_CATEGORIES.has(spec.fileCategory))
    .map(([ext]) => ext)
);

const PRESERVED_FILE_EXTENSIONS = new Set(Object.keys(VAULT_FILE_SPECS));

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/**
 * Generate a stable, deterministic ID from vault name + source path.
 * Using SHA-256 truncated to 16 hex chars for readability.
 */
export function generateNoteId(vaultName: string, sourcePath: string): string {
  return createHash('sha256')
    .update(`${vaultName}:${sourcePath}`)
    .digest('hex')
    .slice(0, 16);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toVaultRelativePath(rootPath: string, filePath: string): string {
  return relative(rootPath, filePath).replace(/\\/g, '/');
}

function getVaultFileSpec(filePath: string): VaultFileSpec | undefined {
  return VAULT_FILE_SPECS[extname(filePath).toLowerCase()];
}

function isImportedAttachment(file: ImportedVaultFile): boolean {
  return ATTACHMENT_CATEGORIES.has(file.fileCategory);
}

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

// ---------------------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------------------

async function scanDirectory(
  dir: string,
  vaultRoot: string
): Promise<ScanDirectoryResult> {
  const mdFiles: string[] = [];
  const preservedFiles: string[] = [];
  const skippedPaths: string[] = [];

  async function recurse(currentDir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const relPath = toVaultRelativePath(vaultRoot, fullPath);

      if (IGNORED_DIRS.has(entry)) {
        skippedPaths.push(relPath);
        continue;
      }

      let fileStat;
      try {
        fileStat = await stat(fullPath);
      } catch {
        skippedPaths.push(relPath);
        continue;
      }

      if (fileStat.isDirectory()) {
        await recurse(fullPath);
        continue;
      }

      const ext = extname(entry).toLowerCase();
      if (ext === NOTE_EXTENSION) {
        mdFiles.push(fullPath);
      } else if (PRESERVED_FILE_EXTENSIONS.has(ext)) {
        preservedFiles.push(fullPath);
      } else {
        skippedPaths.push(relPath);
      }
    }
  }

  await recurse(dir);
  return { mdFiles, preservedFiles, skippedPaths };
}

// ---------------------------------------------------------------------------
// Note processing
// ---------------------------------------------------------------------------

export async function processNoteFile(
  filePath: string,
  vaultRoot: string,
  vaultName: string
): Promise<ImportedNote> {
  const rawContent = await readFile(filePath, 'utf-8');
  const relPath = toVaultRelativePath(vaultRoot, filePath);
  const { frontmatter, content } = parseFrontmatter(rawContent);

  const tags = extractTags(content);
  const fmTags = frontmatter.tags;
  if (Array.isArray(fmTags)) {
    for (const tag of fmTags) {
      if (typeof tag === 'string' && !tags.includes(tag)) {
        tags.push(tag);
      }
    }
  }

  const wikiLinks = extractWikiLinks(content);
  const aliases: string[] = [];
  const fmAliases = frontmatter.aliases;
  if (Array.isArray(fmAliases)) {
    for (const alias of fmAliases) {
      if (typeof alias === 'string') aliases.push(alias);
    }
  }

  const attachmentRefs: string[] = [];
  for (const link of wikiLinks) {
    if (!link.isEmbed || !link.target) continue;
    const ext = extname(link.target).toLowerCase();
    if (ATTACHMENT_EXTENSIONS.has(ext)) {
      attachmentRefs.push(link.target);
    }
  }

  return {
    _id: generateNoteId(vaultName, relPath),
    text: content,
    sourcePath: relPath,
    sourceVault: vaultName,
    frontmatter,
    aliases,
    tags,
    wikiLinks: wikiLinks.map(({ target, heading, alias, isEmbed }) => {
      const entry: {
        target: string;
        heading?: string;
        alias?: string;
        isEmbed: boolean;
      } = { target, isEmbed };
      if (heading !== undefined) entry.heading = heading;
      if (alias !== undefined) entry.alias = alias;
      return entry;
    }),
    attachmentRefs,
  };
}

// ---------------------------------------------------------------------------
// Non-note file processing
// ---------------------------------------------------------------------------

export async function processVaultFile(
  filePath: string,
  vaultRoot: string
): Promise<ImportedVaultFile> {
  const relPath = toVaultRelativePath(vaultRoot, filePath);
  const spec = getVaultFileSpec(filePath);
  const bytes = await readFile(filePath);
  const fileStat = await stat(filePath);

  return {
    sourcePath: relPath,
    name: basename(filePath),
    size: fileStat.size,
    mimeType: spec?.mimeType ?? 'application/octet-stream',
    fileCategory: spec?.fileCategory ?? 'binary',
    contentHash: hashBuffer(bytes),
    copySourcePath: filePath,
  };
}

// ---------------------------------------------------------------------------
// Main import function
// ---------------------------------------------------------------------------

export async function importVault(options: {
  vaultPath: string;
  vaultName: string;
  outputPath?: string;
  dryRun?: boolean;
}): Promise<VaultImportManifest> {
  const { vaultPath, vaultName, outputPath, dryRun = false } = options;

  console.log(`Scanning vault: ${vaultPath}`);
  const scanResult = await scanDirectory(vaultPath, vaultPath);
  console.log(
    `Found ${scanResult.mdFiles.length} notes, ${scanResult.preservedFiles.length} preserved files`
  );

  const notes: ImportedNote[] = [];
  const files: ImportedVaultFile[] = [];
  const skippedPaths = [...scanResult.skippedPaths];

  for (const filePath of scanResult.mdFiles) {
    try {
      notes.push(await processNoteFile(filePath, vaultPath, vaultName));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping ${filePath}: ${errMsg}`);
      skippedPaths.push(toVaultRelativePath(vaultPath, filePath));
    }
  }

  for (const filePath of scanResult.preservedFiles) {
    try {
      files.push(await processVaultFile(filePath, vaultPath));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping file ${filePath}: ${errMsg}`);
      skippedPaths.push(toVaultRelativePath(vaultPath, filePath));
    }
  }

  const attachments = files.filter(isImportedAttachment);

  const manifest: VaultImportManifest = {
    vaultName,
    vaultPath,
    importedAt: new Date().toISOString(),
    notes,
    attachments,
    files,
    skippedPaths: [...new Set(skippedPaths)].sort(),
  };

  if (!dryRun && outputPath) {
    await writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`Manifest written to: ${outputPath}`);
  }

  console.log(
    `Import complete: ${notes.length} notes, ${files.length} preserved files imported from vault "${vaultName}"`
  );

  if (manifest.skippedPaths.length > 0) {
    console.warn(
      `Skipped ${manifest.skippedPaths.length} paths by policy or due to errors`
    );
  }

  return manifest;
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const vaultPath = getArg('--vault');
  const vaultName = getArg('--name') ?? 'My Vault';
  const outputPath = getArg('--output') ?? './vault-import.json';
  const dryRun = args.includes('--dry-run');

  if (!vaultPath) {
    console.error(
      'Usage: npx tsx import-vault.ts --vault /path/to/vault [--name "Vault Name"] [--output ./out.json] [--dry-run]'
    );
    process.exit(1);
  }

  await importVault({ vaultPath, vaultName, outputPath, dryRun });
}

if (process.argv[1] && process.argv[1].endsWith('import-vault.ts')) {
  main().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
