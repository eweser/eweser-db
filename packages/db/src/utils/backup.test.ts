import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Y from 'yjs';
import { getDocuments } from '@eweser/shared';
import type { CollectionKey, EweDocument } from '@eweser/shared';
import {
  createDatabaseSnapshot,
  downloadDatabaseSnapshot,
  dryRunRestoreDatabaseSnapshot,
  listDatabaseSnapshots,
  restoreDatabaseSnapshot,
  serializeDatabaseSnapshot,
  uploadDatabaseSnapshot,
  type DatabaseSnapshot,
} from './backup.js';
import type { Database } from '../index.js';
import type { Room } from '../room.js';

function createRoomFixture(
  options: {
    authServer?: string;
    collectionKey?: CollectionKey;
    id?: string;
    name?: string;
    text?: string;
  } = {}
) {
  const authServer = options.authServer ?? 'https://auth.example.com';
  const collectionKey = options.collectionKey ?? 'notes';
  const id = options.id ?? 'room-1';
  const ydoc = new Y.Doc();
  const documents = getDocuments(
    authServer,
    collectionKey,
    id
  )<EweDocument>(ydoc);
  documents.new({ text: options.text ?? 'hello' } as never, 'doc-1');

  const room = {
    id,
    name: options.name ?? 'Notes',
    collectionKey,
    publicAccess: 'private',
    createdAt: '2026-05-19T00:00:00.000Z',
    updatedAt: '2026-05-19T00:00:00.000Z',
    _deleted: false,
    ydoc,
    getDocuments: () => documents,
    load: vi.fn(async () => room),
  } as unknown as Room<EweDocument>;

  return room;
}

function createFakeDatabase(
  rooms: Room<EweDocument>[] = [],
  options: { authServer?: string } = {}
) {
  const authServer = options.authServer ?? 'https://auth.example.com';
  const roomMap = new Map(rooms.map((room) => [room.id, room]));
  const db = {
    authServer,
    registry: [],
    allRooms: vi.fn(() => Array.from(roomMap.values())),
    getRoom: vi.fn((_collectionKey: CollectionKey, roomId: string) =>
      roomMap.get(roomId)
    ),
    getToken: vi.fn(() => 'grant-token'),
    loadRoom: vi.fn(),
    newRoom: vi.fn((options) => {
      const room = createRoomFixture({
        authServer,
        collectionKey: options.collectionKey,
        id: options.id,
        name: options.name,
        text: 'starter',
      });
      room.getDocuments().delete('doc-1', 0);
      roomMap.set(room.id, room);
      return room;
    }),
  } as unknown as Database;

  return { db, roomMap };
}

describe('database snapshot helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a normalized snapshot bundle with Yjs update bytes', async () => {
    const room = createRoomFixture();
    const { db } = createFakeDatabase([room]);

    const snapshot = await createDatabaseSnapshot({ db });

    expect(snapshot.format).toBe('eweser.snapshot.v1');
    expect(snapshot.roomCount).toBe(1);
    expect(snapshot.documentCount).toBe(1);
    expect(snapshot.rooms[0]?.documents['doc-1']?._id).toBe('doc-1');
    expect(snapshot.rooms[0]?.yjsUpdateBase64.length).toBeGreaterThan(10);
  });

  it('reports conflicts before restore and keeps both documents by default', async () => {
    const sourceRoom = createRoomFixture({ text: 'before' });
    const { db: sourceDb } = createFakeDatabase([sourceRoom]);
    const snapshot = await createDatabaseSnapshot({ db: sourceDb });

    const targetRoom = createRoomFixture({ text: 'after' });
    const { db: targetDb } = createFakeDatabase([targetRoom]);

    const dryRun = await dryRunRestoreDatabaseSnapshot({
      db: targetDb,
      snapshot,
    });
    expect(dryRun.totalConflicts).toBe(1);
    expect(dryRun.rooms[0]?.conflicts).toEqual(['doc-1']);

    const result = await restoreDatabaseSnapshot({
      db: targetDb,
      snapshot,
    });

    expect(result.totalConflicts).toBe(1);
    expect(result.totalCreated).toBe(1);
    const documents = targetRoom.getDocuments().getAll();
    expect(Object.keys(documents)).toHaveLength(2);
    expect(
      Object.values(documents).some((doc) =>
        doc._id.startsWith('doc-1-restored-')
      )
    ).toBe(true);
  });

  it('rewrites restored document refs for the target auth server', async () => {
    const sourceRoom = createRoomFixture({ text: 'portable' });
    const { db: sourceDb } = createFakeDatabase([sourceRoom]);
    const snapshot = await createDatabaseSnapshot({ db: sourceDb });
    const { db: targetDb, roomMap } = createFakeDatabase([], {
      authServer: 'https://auth.target.example',
    });

    await restoreDatabaseSnapshot({
      db: targetDb,
      snapshot,
      conflictStrategy: 'overwrite',
    });

    const restoredDocument = roomMap.get('room-1')?.getDocuments().get('doc-1');
    expect(restoredDocument?._id).toBe('doc-1');
    expect(restoredDocument?._ref).toBe(
      'https://auth.target.example|notes|room-1|doc-1'
    );
  });

  it('uploads snapshot bytes and lists remote snapshots through the auth API', async () => {
    const room = createRoomFixture();
    const { db } = createFakeDatabase([room]);
    const remoteSnapshot = {
      id: 'snapshot-1',
      accessGrantId: 'user-1|app.local',
      providerProfileId: 'railway-buckets',
      objectKey: 'backups/user-1/hash/snapshot.json',
      filename: 'snapshot.json',
      contentHash: 'hash',
      sizeBytes: 100,
      roomCount: 1,
      documentCount: 1,
      retentionExpiresAt: null,
      createdAt: '2026-05-19T00:00:00.000Z',
      updatedAt: null,
    };
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ snapshot: remoteSnapshot }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ snapshots: [remoteSnapshot] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

    await expect(
      uploadDatabaseSnapshot({
        db,
        filename: 'snapshot.json',
        providerProfileId: 'railway-buckets',
      })
    ).resolves.toEqual(remoteSnapshot);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      'https://auth.example.com/api/backups/upload'
    );
    expect(
      (fetchMock.mock.calls[0]?.[1]?.body as FormData).get('snapshot')
    ).toBeInstanceOf(File);

    await expect(listDatabaseSnapshots({ db })).resolves.toEqual([
      remoteSnapshot,
    ]);
    expect(fetchMock.mock.calls[1]?.[0]).toBe(
      'https://auth.example.com/api/backups'
    );
  });

  it('downloads and verifies snapshot content hashes', async () => {
    const room = createRoomFixture();
    const { db } = createFakeDatabase([room]);
    const snapshot: DatabaseSnapshot = await createDatabaseSnapshot({ db });
    const bytes = serializeDatabaseSnapshot(snapshot);
    const contentHash = await crypto.subtle.digest('SHA-256', bytes);
    const contentHashHex = Array.from(new Uint8Array(contentHash))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            expiresInSeconds: 900,
            snapshot: {
              id: 'snapshot-1',
              accessGrantId: 'user-1|app.local',
              providerProfileId: 'railway-buckets',
              objectKey: 'backups/user-1/hash/snapshot.json',
              filename: 'snapshot.json',
              contentHash: contentHashHex,
              sizeBytes: bytes.byteLength,
              roomCount: 1,
              documentCount: 1,
              retentionExpiresAt: null,
              createdAt: '2026-05-19T00:00:00.000Z',
              updatedAt: null,
            },
            url: 'https://bucket.example.com/snapshot.json',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
      .mockResolvedValueOnce(new Response(bytes, { status: 200 }));

    await expect(
      downloadDatabaseSnapshot({ db, snapshotId: 'snapshot-1' })
    ).resolves.toEqual(snapshot);
  });
});
