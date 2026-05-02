// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  importVault,
  generateNoteId,
  processNoteFile,
  type VaultImportManifest,
} from './import-vault';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_VAULT = join(__dirname, '../../test-fixtures/obsidian-vault');
const PARITY_FIXTURE_VAULT = join(
  __dirname,
  '../../test-fixtures/obsidian-parity'
);

describe('generateNoteId', () => {
  it('produces a 16-character hex string', () => {
    const id = generateNoteId('My Vault', 'Basic Formatting.md');
    expect(id).toHaveLength(16);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it('is deterministic — same input always produces same ID', () => {
    const id1 = generateNoteId('vault', 'Folder A/Note.md');
    const id2 = generateNoteId('vault', 'Folder A/Note.md');
    expect(id1).toBe(id2);
  });

  it('differs for different paths', () => {
    const id1 = generateNoteId('vault', 'Note A.md');
    const id2 = generateNoteId('vault', 'Note B.md');
    expect(id1).not.toBe(id2);
  });

  it('differs for different vault names', () => {
    const id1 = generateNoteId('Vault One', 'Note.md');
    const id2 = generateNoteId('Vault Two', 'Note.md');
    expect(id1).not.toBe(id2);
  });
});

describe('processNoteFile', () => {
  it('processes a simple markdown file', async () => {
    const filePath = join(FIXTURE_VAULT, 'Basic Formatting.md');
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    expect(note.sourcePath).toBe('Basic Formatting.md');
    expect(note.sourceVault).toBe('test-vault');
    expect(note.text).toContain('**bold text**');
    expect(note.text).toContain('==highlighted text==');
    expect(note._id).toHaveLength(16);
  });

  it('parses frontmatter from Properties and Tags note', async () => {
    const filePath = join(FIXTURE_VAULT, 'Properties and Tags.md');
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    expect(note.frontmatter.title).toBe('Properties and Tags Test');
    expect(note.frontmatter.number_field).toBe(42);
    expect(note.frontmatter.boolean_field).toBe(true);
    expect(note.aliases).toContain('Props Test');
    expect(note.aliases).toContain('Frontmatter Test');
  });

  it('extracts inline tags', async () => {
    const filePath = join(FIXTURE_VAULT, 'Properties and Tags.md');
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    expect(note.tags).toContain('test');
    expect(note.tags).toContain('inline-tag');
  });

  it('extracts wiki links', async () => {
    const filePath = join(FIXTURE_VAULT, 'Wiki Links.md');
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    const targets = note.wikiLinks.map((l) => l.target);
    expect(targets).toContain('Basic Formatting');
    expect(targets).toContain('Folder A/Nested Note');
  });

  it('preserves folder path in sourcePath for nested notes', async () => {
    const filePath = join(FIXTURE_VAULT, 'Folder A', 'Nested Note.md');
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    expect(note.sourcePath).toBe('Folder A/Nested Note.md');
  });

  it('preserves deep folder path', async () => {
    const filePath = join(
      FIXTURE_VAULT,
      'Folder A',
      'Subfolder',
      'Deep Note.md'
    );
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    expect(note.sourcePath).toBe('Folder A/Subfolder/Deep Note.md');
  });

  it('detects attachment references in embeds', async () => {
    const filePath = join(FIXTURE_VAULT, 'Embeds.md');
    const note = await processNoteFile(filePath, FIXTURE_VAULT, 'test-vault');

    expect(note.attachmentRefs).toContain('Attachments/test-image.png');
  });
});

describe('importVault', () => {
  let manifest: VaultImportManifest;

  it('imports all notes from the test vault', async () => {
    manifest = await importVault({
      vaultPath: FIXTURE_VAULT,
      vaultName: 'test-vault',
      dryRun: true,
    });

    // Should have all 11 test notes (excluding .obsidian/ contents)
    expect(manifest.notes.length).toBeGreaterThanOrEqual(10);
    expect(manifest.vaultName).toBe('test-vault');
  });

  it('finds the test image attachment', async () => {
    manifest ??= await importVault({
      vaultPath: FIXTURE_VAULT,
      vaultName: 'test-vault',
      dryRun: true,
    });

    expect(manifest.attachments.length).toBeGreaterThanOrEqual(1);
    const img = manifest.attachments.find((a) => a.name === 'test-image.png');
    expect(img).toBeDefined();
    expect(img?.mimeType).toBe('image/png');
  });

  it('does not import .obsidian/ config files as notes', async () => {
    manifest ??= await importVault({
      vaultPath: FIXTURE_VAULT,
      vaultName: 'test-vault',
      dryRun: true,
    });

    const paths = manifest.notes.map((n) => n.sourcePath);
    expect(paths.every((p) => !p.startsWith('.obsidian'))).toBe(true);
  });

  it('is idempotent — importing twice produces the same note IDs', async () => {
    const m1 = await importVault({
      vaultPath: FIXTURE_VAULT,
      vaultName: 'test-vault',
      dryRun: true,
    });
    const m2 = await importVault({
      vaultPath: FIXTURE_VAULT,
      vaultName: 'test-vault',
      dryRun: true,
    });

    const ids1 = m1.notes.map((n) => n._id).sort();
    const ids2 = m2.notes.map((n) => n._id).sort();
    expect(ids1).toEqual(ids2);
  });
});

describe('parity fixture CLI contract', () => {
  it('preserves Obsidian-sensitive tokens while importing and serializing', async () => {
    const manifest = await importVault({
      vaultPath: PARITY_FIXTURE_VAULT,
      vaultName: 'parity-vault',
      dryRun: true,
    });

    const byPath = new Map(
      manifest.notes.map((note) => [note.sourcePath, note])
    );

    const wikiEmbeds = byPath.get('wiki-embeds-parity.md');
    expect(wikiEmbeds).toBeDefined();
    expect(wikiEmbeds?.text).toContain('%%Inline wiki comment%%');
    expect(wikiEmbeds?.text).toContain(
      '![[Attachments/test-image.png|640x480]]'
    );
    expect(wikiEmbeds?.text).toContain('[[Basic Parity Note|Quick Jump]]');
    expect(wikiEmbeds?.text).toContain(
      '[[Properties and Tags#Nested Tag|Properties Section]]'
    );

    const callouts = byPath.get('callouts-footnotes-parity.md');
    expect(callouts).toBeDefined();
    expect(callouts?.text).toContain('%%block comment%%');
    expect(callouts?.text).toContain('[^alpha]');
    expect(callouts?.wikiLinks).toHaveLength(0);

    const real = byPath.get('real-note.md');
    expect(real).toBeDefined();
    expect(real?.text).toContain('![[test-image.png]]');
    expect(real?.text).toContain('%%runtime note%%');
    expect(real?.text).toContain('[^shared]');
  });
});
