#!/usr/bin/env node
/**
 * Obsidian Vault Import CLI
 *
 * Scans an Obsidian vault folder and outputs a JSON manifest of notes
 * ready to be loaded into EweserDB rooms.
 *
 * Usage:
 *   npx tsx packages/ewe-note/src/cli/import-vault.ts \
 *     --vault /path/to/vault \
 *     --name "My Vault" \
 *     [--output ./vault-import.json] \
 *     [--dry-run]
 *
 * NOTE: EweserDB uses IndexedDB (browser environment) for storage.
 * This CLI produces a JSON manifest; the app-level import reads this
 * manifest and creates Yjs documents in the browser session.
 */

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

export interface ImportedAttachment {
  /** Relative path within the vault */
  sourcePath: string;
  /** File name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type guessed from extension */
  mimeType: string;
}

export interface VaultImportManifest {
  vaultName: string;
  vaultPath: string;
  importedAt: string;
  notes: ImportedNote[];
  attachments: ImportedAttachment[];
  skippedPaths: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);
const NOTE_EXTENSION = '.md';
const ATTACHMENT_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.mp3',
  '.mp4',
  '.wav',
  '.ogg',
]);

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
};

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
// File scanning
// ---------------------------------------------------------------------------

async function scanDirectory(
  dir: string,
  vaultRoot: string
): Promise<{ mdFiles: string[]; attachmentFiles: string[] }> {
  const mdFiles: string[] = [];
  const attachmentFiles: string[] = [];
  const skipped: string[] = [];

  async function recurse(currentDir: string): Promise<void> {
    let entries: string[];
    try {
      entries = await readdir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.startsWith('.') && IGNORED_DIRS.has(entry)) {
        skipped.push(join(currentDir, entry));
        continue;
      }

      const fullPath = join(currentDir, entry);
      let fileStat;
      try {
        fileStat = await stat(fullPath);
      } catch {
        continue;
      }

      if (fileStat.isDirectory()) {
        await recurse(fullPath);
      } else {
        const ext = extname(entry).toLowerCase();
        if (ext === NOTE_EXTENSION) {
          mdFiles.push(fullPath);
        } else if (ATTACHMENT_EXTENSIONS.has(ext)) {
          attachmentFiles.push(fullPath);
        }
      }
    }
  }

  await recurse(dir);
  void skipped; // Info for future verbose logging
  return { mdFiles, attachmentFiles };
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
  const relPath = relative(vaultRoot, filePath);
  const { frontmatter, content } = parseFrontmatter(rawContent);

  const tags = extractTags(content);
  // Also include tags from frontmatter
  const fmTags = frontmatter.tags;
  if (Array.isArray(fmTags)) {
    for (const t of fmTags) {
      if (typeof t === 'string' && !tags.includes(t)) {
        tags.push(t);
      }
    }
  }

  const wikiLinks = extractWikiLinks(content);
  const aliases: string[] = [];
  const fmAliases = frontmatter.aliases;
  if (Array.isArray(fmAliases)) {
    for (const a of fmAliases) {
      if (typeof a === 'string') aliases.push(a);
    }
  }

  // Collect attachment references from embeds
  const attachmentRefs: string[] = [];
  for (const link of wikiLinks) {
    if (link.isEmbed && link.target) {
      const ext = extname(link.target).toLowerCase();
      if (ATTACHMENT_EXTENSIONS.has(ext)) {
        attachmentRefs.push(link.target);
      }
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
// Attachment processing
// ---------------------------------------------------------------------------

async function processAttachmentFile(
  filePath: string,
  vaultRoot: string
): Promise<ImportedAttachment> {
  const fileStat = await stat(filePath);
  const relPath = relative(vaultRoot, filePath);
  const ext = extname(filePath).toLowerCase();
  return {
    sourcePath: relPath,
    name: basename(filePath),
    size: fileStat.size,
    mimeType: MIME_MAP[ext] ?? 'application/octet-stream',
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
  const { mdFiles, attachmentFiles } = await scanDirectory(
    vaultPath,
    vaultPath
  );
  console.log(
    `Found ${mdFiles.length} notes, ${attachmentFiles.length} attachments`
  );

  const notes: ImportedNote[] = [];
  const skippedPaths: string[] = [];

  for (const filePath of mdFiles) {
    try {
      const note = await processNoteFile(filePath, vaultPath, vaultName);
      notes.push(note);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping ${filePath}: ${errMsg}`);
      skippedPaths.push(filePath);
    }
  }

  const attachments: ImportedAttachment[] = [];
  for (const filePath of attachmentFiles) {
    try {
      attachments.push(await processAttachmentFile(filePath, vaultPath));
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping attachment ${filePath}: ${errMsg}`);
      skippedPaths.push(filePath);
    }
  }

  const manifest: VaultImportManifest = {
    vaultName,
    vaultPath,
    importedAt: new Date().toISOString(),
    notes,
    attachments,
    skippedPaths,
  };

  if (!dryRun && outputPath) {
    await writeFile(outputPath, JSON.stringify(manifest, null, 2), 'utf-8');
    console.log(`Manifest written to: ${outputPath}`);
  }

  console.log(
    `Import complete: ${notes.length} notes, ${attachments.length} attachments imported from vault "${vaultName}"`
  );

  if (skippedPaths.length > 0) {
    console.warn(`Skipped ${skippedPaths.length} files due to errors`);
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

// Only run main when called directly (not in tests)
if (process.argv[1] && process.argv[1].endsWith('import-vault.ts')) {
  main().catch((err) => {
    console.error('Import failed:', err);
    process.exit(1);
  });
}
