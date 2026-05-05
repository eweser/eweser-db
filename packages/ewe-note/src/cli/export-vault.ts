#!/usr/bin/env node
/**
 * Purpose: Obsidian vault export CLI from import manifests.
 * Exports: ExportedNote, serializeNote, and exportVault.
 * Touches: User markdown, YAML frontmatter, and filesystem writes.
 * Read before editing: packages/ewe-note/src/INDEX.md.
 */
/* eslint-disable no-console -- CLI tool: console is the correct output mechanism */
/**
 * Obsidian Vault Export CLI
 *
 * Reads a vault import manifest (produced by import-vault.ts) and writes
 * the notes back out as .md files while reconstructing the folder hierarchy.
 *
 * Usage:
 *   npx tsx packages/ewe-note/src/cli/export-vault.ts \
 *     --manifest ./vault-import.json \
 *     --output /path/to/vault \
 *     [--dry-run]
 *
 * NOTE: For live export from a running EweserDB session, the notes JSON
 * should be captured via the app and passed as the manifest input.
 */

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { serializeFrontmatter } from '@eweser/shared';
import type {
  VaultImportManifest,
  ImportedNote,
  ImportedVaultFile,
} from './import-vault';

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

export interface ExportedNote {
  sourcePath: string;
  content: string;
}

export interface ExportedVaultFile {
  sourcePath: string;
  size: number;
}

// ---------------------------------------------------------------------------
// Note serialization
// ---------------------------------------------------------------------------

/**
 * Serialize a note back to a .md file with YAML frontmatter.
 */
export function serializeNote(note: ImportedNote): string {
  const frontmatter: Record<string, unknown> = { ...note.frontmatter };

  // Ensure aliases and tags are present if non-empty
  if (note.aliases.length > 0 && !frontmatter['aliases']) {
    frontmatter['aliases'] = note.aliases;
  }
  if (note.tags.length > 0 && !frontmatter['tags']) {
    frontmatter['tags'] = note.tags;
  }

  return serializeFrontmatter(frontmatter, note.text);
}

// ---------------------------------------------------------------------------
// Export function
// ---------------------------------------------------------------------------

export async function exportVault(options: {
  manifestPath: string;
  outputPath: string;
  dryRun?: boolean;
}): Promise<{ notes: ExportedNote[]; files: ExportedVaultFile[] }> {
  const { manifestPath, outputPath, dryRun = false } = options;

  const rawManifest = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(rawManifest) as VaultImportManifest;
  const files = manifest.files ?? manifest.attachments ?? [];

  console.log(
    `Exporting ${manifest.notes.length} notes and ${files.length} preserved files from vault "${manifest.vaultName}" to ${outputPath}`
  );

  const exportedNotes: ExportedNote[] = [];
  const exportedFiles: ExportedVaultFile[] = [];

  for (const note of manifest.notes) {
    const content = serializeNote(note);
    const destPath = join(outputPath, note.sourcePath);
    exportedNotes.push({ sourcePath: note.sourcePath, content });

    if (!dryRun) {
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, content, 'utf-8');
    }
  }

  for (const file of files) {
    const destPath = join(outputPath, file.sourcePath);
    exportedFiles.push({ sourcePath: file.sourcePath, size: file.size });

    if (!dryRun) {
      await writeVaultFile(file, destPath);
    }
  }

  console.log(
    `Export complete: ${exportedNotes.length} notes and ${exportedFiles.length} preserved files written`
  );

  return { notes: exportedNotes, files: exportedFiles };
}

async function writeVaultFile(
  file: ImportedVaultFile,
  destPath: string
): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });

  if (file.contentBase64) {
    await writeFile(destPath, Buffer.from(file.contentBase64, 'base64'));
    return;
  }

  if (file.copySourcePath) {
    await copyFile(file.copySourcePath, destPath);
    return;
  }

  throw new Error(
    `Cannot export preserved file "${file.sourcePath}" without contentBase64 or copySourcePath`
  );
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const getArg = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const manifestPath = getArg('--manifest');
  const outputPath = getArg('--output');
  const dryRun = args.includes('--dry-run');

  if (!manifestPath || !outputPath) {
    console.error(
      'Usage: npx tsx export-vault.ts --manifest ./vault-import.json --output /path/to/vault [--dry-run]'
    );
    process.exit(1);
  }

  await exportVault({ manifestPath, outputPath, dryRun });
}

if (process.argv[1] && process.argv[1].endsWith('export-vault.ts')) {
  main().catch((err) => {
    console.error('Export failed:', err);
    process.exit(1);
  });
}
