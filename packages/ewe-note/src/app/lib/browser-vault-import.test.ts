// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { indexedDB } from 'fake-indexeddb';
import {
  clearBrowserAttachmentCacheForTests,
  getCachedBrowserAttachmentBlob,
} from './browser-attachment-cache';

vi.mock('@eweser/db', () => ({
  uploadFile: vi.fn(),
}));

beforeEach(async () => {
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    value: indexedDB,
  });
  await clearBrowserAttachmentCacheForTests();
});

type StoredDocument = Record<string, unknown>;
type CollectionKey = 'notes' | 'fileAttachments';
type TestRoom = {
  getDocuments: () => { set(document: StoredDocument): void };
  load: () => Promise<void>;
};
type TestDatabase = {
  authServer: string;
  getRoom: (collectionKey: CollectionKey, roomId: string) => TestRoom | null;
  newRoom: (options: { collectionKey: CollectionKey; id: string }) => void;
};

function fileWithPath(
  path: string,
  contents: string | Uint8Array,
  options: FilePropertyBag = {}
) {
  const file = new File([contents], path.split('/').pop() ?? path, options);
  Object.defineProperty(file, 'webkitRelativePath', {
    configurable: true,
    value: path,
  });
  return file;
}

function createDocumentStore() {
  const docs: StoredDocument[] = [];
  return {
    docs,
    api: {
      set(document: StoredDocument) {
        docs.push(document);
      },
    },
  };
}

function createRoom(documentsApi: { set(document: StoredDocument): void }) {
  return {
    getDocuments: () => documentsApi,
    load: async () => undefined,
  } satisfies TestRoom;
}

function createImportHarness() {
  const notes = createDocumentStore();
  const attachments = createDocumentStore();
  const rooms = new Map<string, TestRoom>();

  const db = {
    authServer: 'http://auth.test',
    getRoom(collectionKey: CollectionKey, roomId: string) {
      return rooms.get(`${collectionKey}:${roomId}`) ?? null;
    },
    newRoom({
      collectionKey,
      id,
    }: {
      collectionKey: CollectionKey;
      id: string;
    }) {
      rooms.set(
        `${collectionKey}:${id}`,
        collectionKey === 'notes'
          ? createRoom(notes.api)
          : createRoom(attachments.api)
      );
    },
  } satisfies TestDatabase;

  return { attachments: attachments.docs, db, notes: notes.docs };
}

describe('importVaultFromFiles', () => {
  it('preserves local attachment metadata when browser vault import runs without remote sync', async () => {
    const { attachments, db, notes } = createImportHarness();
    const { importVaultFromFiles } = await import('./browser-vault-import');
    const result = await importVaultFromFiles({
      db: db as never,
      files: [
        fileWithPath(
          'Test Vault/Notes/Imported.md',
          '![cover](ignored)\n![[Assets/cover.png]]',
          {
            type: 'text/markdown',
          }
        ),
        fileWithPath('Test Vault/Assets/cover.png', new Uint8Array([1, 2, 3]), {
          type: 'image/png',
        }),
      ],
      remoteSyncEnabled: false,
    });

    const expectedCoverContentHash = [
      '039058c6f2c0cb49',
      '2c533b0a4d14ef77',
      'cc0f78abccced528',
      '7d84a1a2011cfb81',
    ].join('');

    expect(notes).toHaveLength(1);
    expect(result.attachmentsUploaded).toBe(0);
    expect(result.attachmentsSkipped).toBe(0);
    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual(
      expect.objectContaining({
        baseId: result.noteRoomId,
        contentHash: expectedCoverContentHash,
        filename: 'cover.png',
        localAvailability: 'available',
        mimeType: 'image/png',
        size: 3,
        sourcePath: 'Assets/cover.png',
        sourceVault: 'Test Vault',
      })
    );
    expect(attachments[0]?.parentNoteRefs).toEqual([
      `http://auth.test|notes|${result.noteRoomId}|${notes[0]?._id}`,
    ]);

    const cachedBlob = await getCachedBrowserAttachmentBlob({
      baseId: result.noteRoomId,
      contentHash: String(attachments[0]?.contentHash),
      sourcePath: 'Assets/cover.png',
    });
    expect(cachedBlob?.type).toBe('image/png');
    if (!cachedBlob) {
      throw new Error(
        'Expected cached imported attachment blob to be available.'
      );
    }
    expect(Array.from(new Uint8Array(await cachedBlob.arrayBuffer()))).toEqual([
      1, 2, 3,
    ]);
  });

  it('skips local-only attachment metadata when bytes cannot be read', async () => {
    const { attachments, db, notes } = createImportHarness();
    const brokenAttachment = fileWithPath(
      'Test Vault/Assets/broken.png',
      new Uint8Array([1]),
      { type: 'image/png' }
    );
    Object.defineProperty(brokenAttachment, 'arrayBuffer', {
      configurable: true,
      value: vi.fn(async () => {
        throw new Error('read failed');
      }),
    });

    const { importVaultFromFiles } = await import('./browser-vault-import');
    const result = await importVaultFromFiles({
      db: db as never,
      files: [
        fileWithPath('Test Vault/Notes/Imported.md', '![[Assets/broken.png]]', {
          type: 'text/markdown',
        }),
        brokenAttachment,
      ],
      remoteSyncEnabled: false,
    });

    expect(notes).toHaveLength(1);
    expect(attachments).toHaveLength(0);
    expect(result.attachmentsUploaded).toBe(0);
    expect(result.attachmentsSkipped).toBe(1);
    expect(result.warnings).toEqual([
      'Attachment skipped: Assets/broken.png (read failed)',
    ]);
  });
});
