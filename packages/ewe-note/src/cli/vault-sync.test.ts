import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import * as Y from 'yjs';
import { afterEach, describe, expect, it } from 'vitest';
import { getDocuments, type FileAttachment, type Note } from '@eweser/shared';
import {
  EweserRoomVaultSyncEngine,
  VaultSyncEngine,
  waitForRemoteSyncProviderReady,
} from './vault-sync';
import { generateNoteId } from './import-vault';

function createProvider(initialSynced = false) {
  const listeners = new Map<
    'synced' | 'authenticationFailed',
    Set<(payload: { state?: boolean; reason?: string }) => void>
  >([
    ['synced', new Set()],
    ['authenticationFailed', new Set()],
  ]);

  return {
    synced: initialSynced,
    on(
      event: 'synced' | 'authenticationFailed',
      callback: (payload: { state?: boolean; reason?: string }) => void
    ) {
      listeners.get(event)?.add(callback);
    },
    off(
      event: 'synced' | 'authenticationFailed',
      callback: (payload: { state?: boolean; reason?: string }) => void
    ) {
      listeners.get(event)?.delete(callback);
    },
    emit(
      event: 'synced' | 'authenticationFailed',
      payload: { state?: boolean; reason?: string }
    ) {
      listeners.get(event)?.forEach((callback) => callback(payload));
    },
  };
}

const tempRoots: string[] = [];

async function createTempVault(): Promise<string> {
  const vaultPath = await mkdtemp(join(tmpdir(), 'eweser-vault-sync-'));
  tempRoots.push(vaultPath);
  return vaultPath;
}

function createRoomHarness(vaultPath: string, vaultName = 'Test Vault') {
  const roomId = `notes-${crypto.randomUUID()}`;
  const attachmentsRoomId = `attachments-${crypto.randomUUID()}`;
  const engine = new EweserRoomVaultSyncEngine({
    vaultPath,
    vaultName,
    roomId,
    attachmentsRoomId,
    remoteSync: false,
    debounceMs: 5,
  });
  const Notes = getDocuments(
    'http://auth.test',
    'notes',
    roomId
  )<Note>(new Y.Doc());
  const Attachments = getDocuments(
    'http://auth.test',
    'fileAttachments',
    attachmentsRoomId
  )<FileAttachment>(new Y.Doc());
  Object.assign(
    engine as unknown as {
      Notes: typeof Notes;
      Attachments: typeof Attachments;
    },
    { Notes, Attachments }
  );
  return { Attachments, engine, Notes, roomId, vaultName };
}

afterEach(async () => {
  await Promise.all(
    tempRoots
      .splice(0)
      .map((root) => rm(root, { force: true, recursive: true }))
  );
});

describe('waitForRemoteSyncProviderReady', () => {
  it('returns immediately when the provider is already synced', async () => {
    await expect(
      waitForRemoteSyncProviderReady(createProvider(true))
    ).resolves.toBeUndefined();
  });

  it('waits until the provider reports synced', async () => {
    const provider = createProvider(false);
    const ready = waitForRemoteSyncProviderReady(provider, 200);

    setTimeout(() => {
      provider.synced = true;
      provider.emit('synced', { state: true });
    }, 10);

    await expect(ready).resolves.toBeUndefined();
  });

  it('rejects when the provider authentication fails', async () => {
    const provider = createProvider(false);
    const ready = waitForRemoteSyncProviderReady(provider, 200);

    setTimeout(() => {
      provider.emit('authenticationFailed', { reason: 'bad token' });
    }, 10);

    await expect(ready).rejects.toThrow(
      'Remote sync provider authentication failed: bad token'
    );
  });
});

describe('VaultSyncEngine', () => {
  it('imports a changed note file into local state', async () => {
    const vaultPath = await createTempVault();
    const statePath = join(vaultPath, 'state.json');
    await writeFile(
      join(vaultPath, 'Daily.md'),
      [
        '---',
        'aliases:',
        '  - Daily note',
        'tags:',
        '  - journal',
        '---',
        '# Daily',
        '',
        'Hello #today with [[Project Plan]].',
      ].join('\n'),
      'utf-8'
    );

    const engine = new VaultSyncEngine({
      vaultPath,
      vaultName: 'Work Vault',
      statePath,
      debounceMs: 5,
    });
    await engine.onFileChange('Daily.md');

    const state = JSON.parse(await readFile(statePath, 'utf-8')) as {
      notes: Record<
        string,
        { text: string; tags: string[]; aliases: string[] }
      >;
    };
    const note = state.notes[generateNoteId('Work Vault', 'Daily.md')];
    expect(note).toEqual(
      expect.objectContaining({
        aliases: ['Daily note'],
        tags: expect.arrayContaining(['today', 'journal']),
      })
    );
    expect(note?.text).toContain('Hello #today with [[Project Plan]].');
  });

  it('writes notes back to Markdown without dropping frontmatter', async () => {
    const vaultPath = await createTempVault();
    const engine = new VaultSyncEngine({
      vaultPath,
      vaultName: 'Work Vault',
      statePath: join(vaultPath, 'state.json'),
      debounceMs: 5,
    });

    await engine.writeNoteToFile({
      _id: 'note-1',
      aliases: ['Kept alias'],
      attachmentRefs: [],
      frontmatter: {
        status: 'draft',
        tags: ['frontmatter-tag'],
      },
      sourcePath: 'Folder/Exported.md',
      sourceVault: 'Work Vault',
      tags: ['inline-tag'],
      text: 'Body with [[Link]].\n',
      wikiLinks: [],
    });

    const markdown = await readFile(
      join(vaultPath, 'Folder/Exported.md'),
      'utf-8'
    );
    expect(markdown).toContain('status: draft');
    expect(markdown).toContain('frontmatter-tag');
    expect(markdown).toContain('Body with [[Link]].');
  });
});

describe('EweserRoomVaultSyncEngine', () => {
  it('bootstraps existing vault notes into the notes room', async () => {
    const vaultPath = await createTempVault();
    await writeFile(join(vaultPath, 'One.md'), 'First #alpha\n', 'utf-8');
    await writeFile(join(vaultPath, 'Two.md'), 'Second #beta\n', 'utf-8');
    const { engine } = createRoomHarness(vaultPath);

    await (
      engine as unknown as { bootstrapFromVault(): Promise<void> }
    ).bootstrapFromVault();

    expect(engine.getNotes()).toHaveLength(2);
    expect(
      engine
        .getNotes()
        .map((note) => note.sourcePath)
        .sort()
    ).toEqual(['One.md', 'Two.md']);
    expect(engine.getNotes().flatMap((note) => note.tags)).toEqual(
      expect.arrayContaining(['alpha', 'beta'])
    );
  });

  it('soft-deletes room notes when source files are deleted', async () => {
    const vaultPath = await createTempVault();
    await writeFile(join(vaultPath, 'Delete Me.md'), 'Remove me\n', 'utf-8');
    const { engine, Notes, vaultName } = createRoomHarness(vaultPath);
    await engine.onFileChange('Delete Me.md');

    await rm(join(vaultPath, 'Delete Me.md'));
    await engine.onFileDelete('Delete Me.md');

    const deleted = Notes.get(generateNoteId(vaultName, 'Delete Me.md'));
    expect(deleted?._deleted).toBe(true);
    expect(engine.getNotes()).toHaveLength(0);
  });

  it('keeps note identity stable when a file is renamed with the same content', async () => {
    const vaultPath = await createTempVault();
    const markdown = 'Stable identity\n';
    await writeFile(join(vaultPath, 'Old.md'), markdown, 'utf-8');
    const { engine, Notes, vaultName } = createRoomHarness(vaultPath);
    await engine.onFileChange('Old.md');
    const originalId = generateNoteId(vaultName, 'Old.md');

    await rm(join(vaultPath, 'Old.md'));
    await writeFile(join(vaultPath, 'New.md'), markdown, 'utf-8');
    await engine.onFileChange('New.md');

    expect(Notes.get(originalId)).toEqual(
      expect.objectContaining({
        _id: originalId,
        sourcePath: 'New.md',
        vaultSync: expect.objectContaining({
          sourceId: originalId,
          sourcePath: 'New.md',
        }),
      })
    );
    expect(engine.getNotes()).toHaveLength(1);
  });

  it('imports attachment metadata into the attachment room', async () => {
    const vaultPath = await createTempVault();
    await writeFile(join(vaultPath, 'image.png'), Buffer.from('png-bytes'));
    const { Attachments, engine, roomId, vaultName } =
      createRoomHarness(vaultPath);

    await engine.onAttachmentChange('image.png');

    const [attachment] = Attachments.getUndeletedToArray();
    expect(attachment).toEqual(
      expect.objectContaining({
        baseId: roomId,
        filename: 'image.png',
        localAvailability: 'available',
        mimeType: 'image/png',
        size: 9,
        sourcePath: 'image.png',
        sourceVault: vaultName,
      })
    );
    expect(attachment?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(attachment?.localPath).toBe(join(vaultPath, 'image.png'));
  });
});
