// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  createScrubbedVaultCopy,
  importVault,
  generateNoteId,
  processNoteFile,
  inventoryVault,
  vaultFileToAttachmentBase,
  type VaultImportManifest,
} from './import-vault';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const FIXTURE_VAULT = join(__dirname, '../../test-fixtures/obsidian-vault');
const PARITY_FIXTURE_VAULT = join(
  __dirname,
  '../../test-fixtures/obsidian-parity'
);
const FEATURE_FIXTURE_VAULT = join(
  __dirname,
  '../../test-fixtures/obsidian-feature-vault'
);

const SECRET_FIXTURE_AWS_KEY = ['AKIA1234', '567890ABCDEF'].join('');
const SECRET_FIXTURE_OPENAI_KEY = ['sk-test_', '12345678901234567890'].join('');
const SECRET_FIXTURE_PRIVATE_KEY_HEADER = [
  '-----BEGIN',
  ' PRIVATE KEY-----',
].join('');

async function createSecretFixtureVault(): Promise<string> {
  const vaultDir = await mkdtemp(join(tmpdir(), 'ewe-note-inventory-'));

  await mkdir(join(vaultDir, 'Notes'), { recursive: true });
  await mkdir(join(vaultDir, 'Canvas'), { recursive: true });
  await mkdir(join(vaultDir, 'Bases'), { recursive: true });
  await mkdir(join(vaultDir, 'Attachments'), { recursive: true });
  await mkdir(join(vaultDir, '.obsidian'), { recursive: true });

  await writeFile(
    join(vaultDir, 'Notes', 'Secret Note.md'),
    [
      '# Secret Note',
      '',
      `AWS key: ${SECRET_FIXTURE_AWS_KEY}`,
      'token: super-secret-value',
      `OpenAI key: ${SECRET_FIXTURE_OPENAI_KEY}`,
      SECRET_FIXTURE_PRIVATE_KEY_HEADER,
      'MIIEvQIBADANBgkqhkiG9w0BAQEFAASC',
      '-----END PRIVATE KEY-----',
    ].join('\n'),
    'utf-8'
  );

  await writeFile(
    join(vaultDir, 'Notes', 'Clean Note.md'),
    ['# Clean Note', '', 'This note is safe to copy.'].join('\n'),
    'utf-8'
  );

  await writeFile(
    join(vaultDir, 'Canvas', 'Board.canvas'),
    JSON.stringify(
      {
        nodes: [{ id: 'node-1', text: 'api_key = "canvas-secret"' }],
      },
      null,
      2
    ),
    'utf-8'
  );

  await writeFile(
    join(vaultDir, 'Bases', 'Base.base'),
    ['title: Secret Base', 'password: base-secret-value', 'notes: []'].join(
      '\n'
    ),
    'utf-8'
  );

  await writeFile(
    join(vaultDir, 'Attachments', 'image.png'),
    Buffer.from([0, 1, 2, 3, 4, 5])
  );

  await writeFile(
    join(vaultDir, 'Loose.txt'),
    'token = loose-secret-value',
    'utf-8'
  );

  await writeFile(join(vaultDir, '.obsidian', 'config'), 'ignored', 'utf-8');

  return vaultDir;
}

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

describe('feature vault file preservation contract', () => {
  let manifest: VaultImportManifest;

  it('imports the feature vault with preserved file inventory metadata', async () => {
    manifest = await importVault({
      vaultPath: FEATURE_FIXTURE_VAULT,
      vaultName: 'feature-vault',
      dryRun: true,
    });

    expect(manifest.notes.length).toBeGreaterThan(10);
    expect(manifest.files.length).toBeGreaterThanOrEqual(20);
    expect(manifest.attachments.length).toBeLessThan(manifest.files.length);
  });

  it('preserves .canvas and .base files in the manifest files inventory', async () => {
    manifest ??= await importVault({
      vaultPath: FEATURE_FIXTURE_VAULT,
      vaultName: 'feature-vault',
      dryRun: true,
    });

    const canvas = manifest.files.find(
      (file) => file.sourcePath === 'Canvas/Feature Map.canvas'
    );
    const base = manifest.files.find(
      (file) => file.sourcePath === 'Bases/Projects.base'
    );

    expect(canvas).toBeDefined();
    expect(canvas?.fileCategory).toBe('canvas');
    expect(canvas?.mimeType).toBe('application/json');
    expect(canvas?.contentHash).toHaveLength(64);

    expect(base).toBeDefined();
    expect(base?.fileCategory).toBe('base');
    expect(base?.mimeType).toBe('text/yaml');
    expect(base?.contentHash).toHaveLength(64);
  });

  it('expands preserved attachment formats to Obsidian fixture media types', async () => {
    manifest ??= await importVault({
      vaultPath: FEATURE_FIXTURE_VAULT,
      vaultName: 'feature-vault',
      dryRun: true,
    });

    const byPath = new Map(
      manifest.files.map((file) => [file.sourcePath, file])
    );

    expect(byPath.get('Attachments/cover.avif')?.fileCategory).toBe('image');
    expect(byPath.get('Attachments/scan.bmp')?.fileCategory).toBe('image');
    expect(byPath.get('Attachments/archive.m4a')?.fileCategory).toBe('audio');
    expect(byPath.get('Attachments/field-recording.flac')?.fileCategory).toBe(
      'audio'
    );
    expect(byPath.get('Attachments/mobile-capture.3gp')?.fileCategory).toBe(
      'video'
    );
    expect(byPath.get('Attachments/clip.mkv')?.fileCategory).toBe('video');
    expect(byPath.get('Attachments/overview.webm')?.fileCategory).toBe('video');
    expect(
      manifest.attachments.some(
        (file) => file.sourcePath === 'Canvas/Feature Map.canvas'
      )
    ).toBe(false);
  });

  it('maps preserved attachment inventory to shared attachment metadata', async () => {
    manifest ??= await importVault({
      vaultPath: FEATURE_FIXTURE_VAULT,
      vaultName: 'feature-vault',
      dryRun: true,
    });

    const image = manifest.attachments.find(
      (file) => file.sourcePath === 'Attachments/cover.avif'
    );
    expect(image).toBeDefined();
    if (!image) throw new Error('Expected fixture image attachment.');

    const metadata = vaultFileToAttachmentBase(image, {
      baseId: 'feature-base',
      sourceVault: manifest.vaultName,
      parentNoteRefs: ['local|notes|room|note'],
    });

    expect(metadata).toMatchObject({
      baseId: 'feature-base',
      sourcePath: 'Attachments/cover.avif',
      filename: 'cover.avif',
      mimeType: 'image/avif',
      size: image.size,
      contentHash: image.contentHash,
      sourceVault: 'feature-vault',
      parentNoteRefs: ['local|notes|room|note'],
      localAvailability: 'available',
      localPath: image.copySourcePath,
    });
  });

  it('explicitly skips .obsidian config paths from the preserved inventory', async () => {
    manifest ??= await importVault({
      vaultPath: FEATURE_FIXTURE_VAULT,
      vaultName: 'feature-vault',
      dryRun: true,
    });

    expect(
      manifest.files.every((file) => !file.sourcePath.startsWith('.obsidian'))
    ).toBe(true);
    expect(manifest.skippedPaths).toContain('.obsidian');
  });
});

describe('inventoryVault', () => {
  it('produces a no-content inventory summary with redacted secret findings', async () => {
    const vaultPath = await createSecretFixtureVault();

    try {
      const report = await inventoryVault({
        vaultPath,
        vaultName: 'secret-vault',
      });

      const serialized = JSON.stringify(report);

      expect(report.vaultName).toBe('secret-vault');
      expect(report.fileCounts.notes).toBe(2);
      expect(report.fileCounts.preservedFiles).toBe(3);
      expect(report.fileCounts.attachments).toBe(1);
      expect(report.fileCounts.textLikeFiles).toBe(3);
      expect(report.attachmentCountByExtension['.png']).toBe(1);
      expect(report.attachmentCountByMimeFamily.image).toBe(1);
      expect(report.totalAttachmentBytes).toBe(6);
      expect(report.topLevelFolderCounts.map((entry) => entry.folder)).toEqual(
        expect.arrayContaining([
          'Notes',
          'Canvas',
          'Bases',
          'Attachments',
          '(root)',
        ])
      );
      expect(report.secretFindings.length).toBeGreaterThanOrEqual(5);
      expect(report.secretFindingCountByRule['private-key-block']).toBe(1);
      expect(serialized).not.toContain(SECRET_FIXTURE_AWS_KEY);
      expect(serialized).not.toContain('super-secret-value');
      expect(serialized).not.toContain(SECRET_FIXTURE_OPENAI_KEY);
      expect(serialized).not.toContain('canvas-secret');

      const noteFinding = report.secretFindings.find(
        (finding) =>
          finding.path === 'Notes/Secret Note.md' &&
          finding.ruleId === 'aws-access-key-id'
      );
      expect(noteFinding?.lineNumber).toBe(3);
      expect(noteFinding?.redactedSnippet).toContain('[REDACTED_SECRET]');

      const canvasFinding = report.secretFindings.find(
        (finding) =>
          finding.path === 'Canvas/Board.canvas' &&
          finding.ruleId === 'generic-credential-assignment'
      );
      expect(canvasFinding).toBeDefined();
      expect(canvasFinding?.redactedSnippet).toContain('[REDACTED_SECRET]');
    } finally {
      await rm(vaultPath, { recursive: true, force: true });
    }
  });
});

describe('createScrubbedVaultCopy', () => {
  it('copies only clean text files by default and skips attachments', async () => {
    const vaultPath = await createSecretFixtureVault();
    const outputPath = await mkdtemp(join(tmpdir(), 'ewe-note-scrubbed-'));

    try {
      const report = await createScrubbedVaultCopy({
        vaultPath,
        vaultName: 'secret-vault',
        outputPath,
      });

      expect(report.fileCounts.copiedNotes).toBe(1);
      expect(report.fileCounts.copiedTextLikeFiles).toBe(0);
      expect(report.fileCounts.copiedAttachments).toBe(0);
      expect(report.fileCounts.skippedSecretTextFiles).toBe(4);
      expect(report.fileCounts.skippedAttachments).toBe(1);
      expect(report.skippedSecretPaths).toEqual(
        expect.arrayContaining([
          'Notes/Secret Note.md',
          'Canvas/Board.canvas',
          'Bases/Base.base',
          'Loose.txt',
        ])
      );

      const cleanCopy = await readFile(
        join(outputPath, 'Notes', 'Clean Note.md'),
        'utf-8'
      );
      expect(cleanCopy).toContain('This note is safe to copy.');

      await expect(
        readFile(join(outputPath, 'Notes', 'Secret Note.md'), 'utf-8')
      ).rejects.toThrow();
      await expect(
        readFile(join(outputPath, 'Attachments', 'image.png'))
      ).rejects.toThrow();
    } finally {
      await rm(vaultPath, { recursive: true, force: true });
      await rm(outputPath, { recursive: true, force: true });
    }
  });
});
