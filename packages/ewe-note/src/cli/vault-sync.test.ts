// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, writeFile, rm, readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { VaultSyncEngine } from './vault-sync';
import { serializeNote } from './export-vault';
import type { ImportedNote } from './import-vault';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
void __filename; // suppress unused warning

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createTempVault(): Promise<string> {
  return mkdtemp(join(tmpdir(), 'vault-sync-test-'));
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
