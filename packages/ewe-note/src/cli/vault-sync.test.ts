// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { VaultSyncEngine } from './vault-sync';
import { exportVault, serializeNote } from './export-vault';
import { importVault, type ImportedNote } from './import-vault';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
void __filename; // suppress unused warning
const FEATURE_FIXTURE_VAULT = join(
  __dirname,
  '../../test-fixtures/obsidian-feature-vault'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'vault-sync-test-'));
}

function sha256(content: Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

function makeNote(overrides: Partial<ImportedNote> = {}): ImportedNote {
  return {
    _id: 'test-note-id',
    text: '# Hello\n\nTest note content.',
    sourcePath: 'Test Note.md',
    sourceVault: 'test-vault',
    frontmatter: { title: 'Test Note' },
    aliases: [],
    tags: ['test'],
    wikiLinks: [],
    attachmentRefs: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// serializeNote (export-vault.ts)
// ---------------------------------------------------------------------------

describe('serializeNote', () => {
  it('serializes a note with frontmatter', () => {
    const note = makeNote({
      frontmatter: { title: 'My Note', date: '2026-04-04' },
      text: '# My Note\n\nContent.',
    });
    const result = serializeNote(note);
    expect(result).toContain('---\ntitle: My Note');
    expect(result).toContain('date: 2026-04-04');
    expect(result).toContain('# My Note');
  });

  it('serializes a note without frontmatter as plain markdown', () => {
    const note = makeNote({
      frontmatter: {},
      tags: [],
      aliases: [],
      text: '# Simple Note',
    });
    const result = serializeNote(note);
    expect(result).toBe('# Simple Note');
  });

  it('includes tags in frontmatter if not already present', () => {
    const note = makeNote({
      frontmatter: {},
      tags: ['myTag'],
      text: 'Content.',
    });
    const result = serializeNote(note);
    expect(result).toContain('tags:');
    expect(result).toContain('myTag');
  });

  it('preserves Obsidian parity source tokens during export serialization', () => {
    const note = makeNote({
      frontmatter: { title: 'Parity Export', aliases: ['PE'] },
      tags: ['export'],
      text: [
        '> [!project-risk]- Custom callout',
        '> body',
        '',
        '![[Attachments/test-image.png|640x480]]',
        '',
        '%%export comment%%',
        '',
        '[^one]: Export footnote',
      ].join('\n'),
    });

    const result = serializeNote(note);
    expect(result).toContain('aliases:');
    expect(result).toContain('> [!project-risk]- Custom callout');
    expect(result).toContain('![[Attachments/test-image.png|640x480]]');
    expect(result).toContain('%%export comment%%');
    expect(result).toContain('[^one]: Export footnote');
  });
});

// ---------------------------------------------------------------------------
// VaultSyncEngine
// ---------------------------------------------------------------------------

describe('VaultSyncEngine', () => {
  let tempDir: string;
  let statePath: string;
  let engine: VaultSyncEngine;

  beforeEach(async () => {
    tempDir = await createTempVault();
    statePath = join(tempDir, 'state.json');
    engine = new VaultSyncEngine({
      vaultPath: tempDir,
      vaultName: 'test-vault',
      statePath,
      debounceMs: 50,
    });
  });

  afterEach(async () => {
    await engine.stop();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('updates state when a file changes', async () => {
    const notePath = join(tempDir, 'New Note.md');
    await writeFile(notePath, '# New Note\n\nContent here.', 'utf-8');

    await engine.onFileChange('New Note.md');

    const state = engine['state']; // access private for testing
    const notes = Object.values(state.notes);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.text).toContain('Content here.');
    expect(notes[0]?.sourcePath).toBe('New Note.md');
  });

  it('soft-deletes a note when file is removed', async () => {
    // First add a note
    const notePath = join(tempDir, 'To Delete.md');
    await writeFile(notePath, '# To Delete', 'utf-8');
    await engine.onFileChange('To Delete.md');

    expect(Object.keys(engine['state'].notes)).toHaveLength(1);

    // Now simulate deletion
    await engine.onFileDelete('To Delete.md');

    expect(Object.keys(engine['state'].notes)).toHaveLength(0);
  });

  it('writes a note to disk when state is updated', async () => {
    const note = makeNote({
      sourcePath: 'Written Note.md',
      text: 'This was written from state.',
      frontmatter: { title: 'Written Note' },
    });

    await engine.writeNoteToFile(note);

    const content = await readFile(join(tempDir, 'Written Note.md'), 'utf-8');
    expect(content).toContain('This was written from state.');
    expect(content).toContain('title: Written Note');
  });

  it('creates subdirectory when writing nested note', async () => {
    const note = makeNote({
      sourcePath: 'Folder A/Nested.md',
      text: 'Nested content.',
      frontmatter: {},
    });

    await engine.writeNoteToFile(note);

    const content = await readFile(
      join(tempDir, 'Folder A', 'Nested.md'),
      'utf-8'
    );
    expect(content).toContain('Nested content.');
  });

  it('does not rewrite file if content is unchanged', async () => {
    const note = makeNote({
      sourcePath: 'Same Content.md',
      text: 'Same content.',
      frontmatter: {},
    });

    await engine.writeNoteToFile(note);
    const mtime1 = (
      await (
        await import('node:fs/promises')
      ).stat(join(tempDir, 'Same Content.md'))
    ).mtime;

    // Small delay to ensure mtime would differ if written again
    await new Promise((r) => setTimeout(r, 20));
    await engine.writeNoteToFile(note);
    const mtime2 = (
      await (
        await import('node:fs/promises')
      ).stat(join(tempDir, 'Same Content.md'))
    ).mtime;

    expect(mtime1.getTime()).toBe(mtime2.getTime());
  });

  it('persists state to JSON file', async () => {
    const notePath = join(tempDir, 'Persisted Note.md');
    await writeFile(notePath, '# Persisted', 'utf-8');
    await engine.onFileChange('Persisted Note.md');

    const raw = await readFile(statePath, 'utf-8');
    const state = JSON.parse(raw);
    expect(Object.keys(state.notes)).toHaveLength(1);
  });

  it('creates subfolder for notes before writing', async () => {
    const deepPath = join(tempDir, 'A', 'B', 'Deep.md');
    await mkdir(join(tempDir, 'A', 'B'), { recursive: true });
    await writeFile(deepPath, '# Deep', 'utf-8');

    await engine.onFileChange('A/B/Deep.md');

    const note = Object.values(engine['state'].notes)[0];
    expect(note?.sourcePath).toBe('A/B/Deep.md');
  });
});

describe('exportVault', () => {
  it('writes preserved non-note vault files byte-for-byte during export', async () => {
    const manifest = await importVault({
      vaultPath: FEATURE_FIXTURE_VAULT,
      vaultName: 'feature-vault',
      dryRun: true,
    });
    const tempDir = await createTempVault();
    const manifestPath = join(tempDir, 'manifest.json');
    const outputDir = join(tempDir, 'exported-vault');

    try {
      await writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

      const result = await exportVault({
        manifestPath,
        outputPath: outputDir,
      });

      expect(result.notes.length).toBe(manifest.notes.length);
      expect(result.files.length).toBe(manifest.files.length);

      const exportedCanvas = await readFile(
        join(outputDir, 'Canvas', 'Feature Map.canvas')
      );
      const exportedBase = await readFile(
        join(outputDir, 'Bases', 'Projects.base')
      );
      const exportedAvif = await readFile(
        join(outputDir, 'Attachments', 'cover.avif')
      );

      const sourceCanvas = await readFile(
        join(FEATURE_FIXTURE_VAULT, 'Canvas', 'Feature Map.canvas')
      );
      const sourceBase = await readFile(
        join(FEATURE_FIXTURE_VAULT, 'Bases', 'Projects.base')
      );
      const sourceAvif = await readFile(
        join(FEATURE_FIXTURE_VAULT, 'Attachments', 'cover.avif')
      );

      expect(sha256(exportedCanvas)).toBe(sha256(sourceCanvas));
      expect(sha256(exportedBase)).toBe(sha256(sourceBase));
      expect(sha256(exportedAvif)).toBe(sha256(sourceAvif));
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
