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

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { serializeFrontmatter } from '@eweser/shared';
import type { VaultImportManifest, ImportedNote } from './import-vault';

// ---------------------------------------------------------------------------
// Export types
// ---------------------------------------------------------------------------

export interface ExportedNote {
  sourcePath: string;
  content: string;
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
}): Promise<ExportedNote[]> {
  const { manifestPath, outputPath, dryRun = false } = options;

  const rawManifest = await readFile(manifestPath, 'utf-8');
  const manifest = JSON.parse(rawManifest) as VaultImportManifest;

  console.log(
    `Exporting ${manifest.notes.length} notes from vault "${manifest.vaultName}" to ${outputPath}`
  );

  const exported: ExportedNote[] = [];

  for (const note of manifest.notes) {
    const content = serializeNote(note);
    const destPath = join(outputPath, note.sourcePath);
    exported.push({ sourcePath: note.sourcePath, content });

    if (!dryRun) {
      await mkdir(dirname(destPath), { recursive: true });
      await writeFile(destPath, content, 'utf-8');
    }
  }

  console.log(`Export complete: ${exported.length} notes written`);

  return exported;
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
