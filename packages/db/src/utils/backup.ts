import * as Y from 'yjs';
import type {
  CollectionKey,
  Documents,
  EweDocument,
  PublicAccessType,
} from '@eweser/shared';
import { buildRef, randomString } from '@eweser/shared';
import type { Database } from '../index.js';
import type { Room } from '../room.js';

const SNAPSHOT_FORMAT = 'eweser.snapshot.v1';
const SNAPSHOT_CONTENT_TYPE = 'application/vnd.eweser.snapshot+json';

export type SnapshotConflictStrategy =
  | 'keep-both'
  | 'overwrite'
  | 'skip-existing';

export type SnapshotRoom = {
  id: string;
  name: string;
  collectionKey: CollectionKey;
  publicAccess: PublicAccessType;
  createdAt: string | null;
  updatedAt: string | null;
  documentCount: number;
  documents: Documents<EweDocument>;
  yjsUpdateBase64: string;
};

export type DatabaseSnapshot = {
  format: typeof SNAPSHOT_FORMAT;
  createdAt: string;
  documentCount: number;
  roomCount: number;
  rooms: SnapshotRoom[];
};

export type SnapshotDryRunRoom = {
  roomId: string;
  roomName: string;
  collectionKey: CollectionKey;
  action: 'create-room' | 'merge-room';
  incomingDocuments: number;
  existingDocuments: number;
  conflicts: string[];
  irreversibleActions: string[];
};

export type SnapshotDryRun = {
  documentCount: number;
  roomCount: number;
  rooms: SnapshotDryRunRoom[];
  totalConflicts: number;
};

export type SnapshotRestoreRoom = SnapshotDryRunRoom & {
  createdDocuments: number;
  skippedDocuments: number;
  updatedDocuments: number;
};

export type SnapshotRestoreResult = {
  rooms: SnapshotRestoreRoom[];
  totalConflicts: number;
  totalCreated: number;
  totalSkipped: number;
  totalUpdated: number;
};

export type RemoteSnapshotRecord = {
  id: string;
  accessGrantId: string | null;
  providerProfileId: string;
  objectKey: string;
  filename: string;
  contentHash: string;
  sizeBytes: number;
  roomCount: number;
  documentCount: number;
  retentionExpiresAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

type SnapshotApiResponse = {
  snapshot: RemoteSnapshotRecord;
};

type SnapshotListResponse = {
  snapshots: RemoteSnapshotRecord[];
};

type SnapshotDownloadUrlResponse = {
  expiresInSeconds: number;
  snapshot: RemoteSnapshotRecord;
  url: string;
};

function requireToken(db: Database): string {
  const token = db.getToken();
  if (!token) {
    throw new Error('No access grant token available for backup request.');
  }
  return token;
}

async function fetchJson<T>(
  db: Database,
  path: string,
  init: RequestInit
): Promise<T> {
  const token = requireToken(db);
  const response = await fetch(`${db.authServer}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as { error?: string } & T;
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Backup request failed: ${response.status}`);
  }

  return data;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    const chunk = bytes.subarray(index, index + 0x8000);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function normalizeSnapshot(input: DatabaseSnapshot | string | Uint8Array) {
  if (typeof input === 'string') {
    return parseDatabaseSnapshot(input);
  }
  if (input instanceof Uint8Array) {
    return parseDatabaseSnapshot(input);
  }
  return input;
}

function parseJsonSnapshot(value: unknown): DatabaseSnapshot {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid database snapshot.');
  }
  const snapshot = value as Partial<DatabaseSnapshot>;
  if (snapshot.format !== SNAPSHOT_FORMAT || !Array.isArray(snapshot.rooms)) {
    throw new Error('Unsupported database snapshot format.');
  }
  return snapshot as DatabaseSnapshot;
}

async function ensureRoomLoaded<T extends EweDocument>(
  room: Room<T>
): Promise<Room<T>> {
  if (!room.ydoc) {
    await room.load({ loadRemote: false });
  }
  if (!room.ydoc) {
    throw new Error(`Room ${room.name} has no loaded Yjs document.`);
  }
  return room;
}

async function findExistingRoom(
  db: Database,
  snapshotRoom: SnapshotRoom
): Promise<Room<EweDocument> | null> {
  const loaded = db.getRoom(snapshotRoom.collectionKey, snapshotRoom.id);
  if (loaded) {
    return await ensureRoomLoaded(loaded as unknown as Room<EweDocument>);
  }

  const registryRoom = db.registry.find(
    (room) =>
      room.id === snapshotRoom.id &&
      room.collectionKey === snapshotRoom.collectionKey
  );
  if (!registryRoom) {
    return null;
  }

  return (await db.loadRoom(registryRoom, {
    loadRemote: false,
  })) as unknown as Room<EweDocument>;
}

function createRestoredDocumentId(originalId: string) {
  return `${originalId}-restored-${Date.now()}-${randomString(6)}`;
}

function cloneDocumentForRestore(
  db: Database,
  snapshotRoom: SnapshotRoom,
  document: EweDocument
): EweDocument {
  const documentId = createRestoredDocumentId(document._id);
  return {
    ...document,
    _id: documentId,
    _ref: buildRef({
      authServer: db.authServer,
      collectionKey: snapshotRoom.collectionKey,
      roomId: snapshotRoom.id,
      documentId,
    }),
    _updated: Date.now(),
  } as EweDocument;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error('SHA-256 verification is unavailable.');
  }
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', copy.buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function createDatabaseSnapshot(params: {
  db: Database;
  rooms?: Array<Room<EweDocument>>;
}): Promise<DatabaseSnapshot> {
  const rooms = params.rooms ?? params.db.allRooms();
  const snapshotRooms: SnapshotRoom[] = [];

  for (const room of rooms) {
    if (room._deleted) continue;

    const loaded = await ensureRoomLoaded(room);
    const documents = loaded.getDocuments().getAll();
    const yjsUpdateBase64 = bytesToBase64(
      Y.encodeStateAsUpdate(loaded.ydoc as Y.Doc)
    );

    snapshotRooms.push({
      id: loaded.id,
      name: loaded.name,
      collectionKey: loaded.collectionKey,
      publicAccess: loaded.publicAccess,
      createdAt: loaded.createdAt,
      updatedAt: loaded.updatedAt,
      documentCount: Object.keys(documents).length,
      documents: documents as Documents<EweDocument>,
      yjsUpdateBase64,
    });
  }

  return {
    format: SNAPSHOT_FORMAT,
    createdAt: new Date().toISOString(),
    roomCount: snapshotRooms.length,
    documentCount: snapshotRooms.reduce(
      (total, room) => total + room.documentCount,
      0
    ),
    rooms: snapshotRooms,
  };
}

export function serializeDatabaseSnapshot(snapshot: DatabaseSnapshot) {
  return new TextEncoder().encode(JSON.stringify(snapshot));
}

export function parseDatabaseSnapshot(input: string | Uint8Array) {
  const json =
    typeof input === 'string' ? input : new TextDecoder().decode(input);
  return parseJsonSnapshot(JSON.parse(json));
}

export async function dryRunRestoreDatabaseSnapshot(params: {
  db: Database;
  snapshot: DatabaseSnapshot | string | Uint8Array;
}): Promise<SnapshotDryRun> {
  const snapshot = normalizeSnapshot(params.snapshot);
  const rooms: SnapshotDryRunRoom[] = [];

  for (const snapshotRoom of snapshot.rooms) {
    const existing = await findExistingRoom(params.db, snapshotRoom);
    const existingDocuments = existing?.getDocuments().getAll() ?? {};
    const incomingIds = Object.keys(snapshotRoom.documents);
    const conflicts = incomingIds.filter((id) =>
      Boolean(existingDocuments[id])
    );

    rooms.push({
      roomId: snapshotRoom.id,
      roomName: snapshotRoom.name,
      collectionKey: snapshotRoom.collectionKey,
      action: existing ? 'merge-room' : 'create-room',
      incomingDocuments: incomingIds.length,
      existingDocuments: Object.keys(existingDocuments).length,
      conflicts,
      irreversibleActions: [],
    });
  }

  return {
    roomCount: rooms.length,
    documentCount: rooms.reduce(
      (total, room) => total + room.incomingDocuments,
      0
    ),
    rooms,
    totalConflicts: rooms.reduce(
      (total, room) => total + room.conflicts.length,
      0
    ),
  };
}

export async function restoreDatabaseSnapshot(params: {
  conflictStrategy?: SnapshotConflictStrategy | undefined;
  db: Database;
  snapshot: DatabaseSnapshot | string | Uint8Array;
}): Promise<SnapshotRestoreResult> {
  const snapshot = normalizeSnapshot(params.snapshot);
  const conflictStrategy = params.conflictStrategy ?? 'keep-both';
  const rooms: SnapshotRestoreRoom[] = [];

  for (const snapshotRoom of snapshot.rooms) {
    const existing = await findExistingRoom(params.db, snapshotRoom);
    const targetRoom =
      existing ??
      params.db.newRoom({
        id: snapshotRoom.id,
        name: snapshotRoom.name,
        collectionKey: snapshotRoom.collectionKey,
        publicAccess: snapshotRoom.publicAccess,
        createdAt: snapshotRoom.createdAt,
        updatedAt: snapshotRoom.updatedAt,
      });
    const loaded = await ensureRoomLoaded(
      targetRoom as unknown as Room<EweDocument>
    );
    const documents = loaded.getDocuments();
    const existingDocuments = documents.getAll();
    const incomingEntries = Object.entries(snapshotRoom.documents);
    const conflicts = incomingEntries
      .filter(([id]) => Boolean(existingDocuments[id]))
      .map(([id]) => id);

    const result: SnapshotRestoreRoom = {
      roomId: snapshotRoom.id,
      roomName: snapshotRoom.name,
      collectionKey: snapshotRoom.collectionKey,
      action: existing ? 'merge-room' : 'create-room',
      incomingDocuments: incomingEntries.length,
      existingDocuments: Object.keys(existingDocuments).length,
      conflicts,
      irreversibleActions: [],
      createdDocuments: 0,
      skippedDocuments: 0,
      updatedDocuments: 0,
    };

    loaded.ydoc?.transact(() => {
      for (const [id, document] of incomingEntries) {
        const hasConflict = Boolean(documents.get(id));
        if (hasConflict && conflictStrategy === 'skip-existing') {
          result.skippedDocuments += 1;
          continue;
        }

        if (hasConflict && conflictStrategy === 'keep-both') {
          documents.set(
            cloneDocumentForRestore(params.db, snapshotRoom, document)
          );
          result.createdDocuments += 1;
          continue;
        }

        documents.set(document);
        if (hasConflict) {
          result.updatedDocuments += 1;
        } else {
          result.createdDocuments += 1;
        }
      }
    }, 'eweser-snapshot-restore');

    rooms.push(result);
  }

  return {
    rooms,
    totalConflicts: rooms.reduce(
      (total, room) => total + room.conflicts.length,
      0
    ),
    totalCreated: rooms.reduce(
      (total, room) => total + room.createdDocuments,
      0
    ),
    totalSkipped: rooms.reduce(
      (total, room) => total + room.skippedDocuments,
      0
    ),
    totalUpdated: rooms.reduce(
      (total, room) => total + room.updatedDocuments,
      0
    ),
  };
}

export async function uploadDatabaseSnapshot(params: {
  db: Database;
  filename?: string | undefined;
  providerProfileId?: string | undefined;
  retentionDays?: number | undefined;
  rooms?: Array<Room<EweDocument>> | undefined;
  snapshot?: DatabaseSnapshot | undefined;
}): Promise<RemoteSnapshotRecord> {
  const snapshot =
    params.snapshot ??
    (await createDatabaseSnapshot({
      db: params.db,
      ...(params.rooms ? { rooms: params.rooms } : {}),
    }));
  const bytes = serializeDatabaseSnapshot(snapshot);
  const filename =
    params.filename ??
    `eweser-snapshot-${snapshot.createdAt.slice(0, 10)}.json`;

  const metadata = {
    createdAt: snapshot.createdAt,
    documentCount: snapshot.documentCount,
    filename,
    providerProfileId: params.providerProfileId,
    retentionDays: params.retentionDays,
    roomCount: snapshot.roomCount,
  };
  const form = new FormData();
  form.append('metadata', JSON.stringify(metadata));
  if (params.providerProfileId) {
    form.append('providerProfileId', params.providerProfileId);
  }
  form.append(
    'snapshot',
    new Blob([bytes], { type: SNAPSHOT_CONTENT_TYPE }),
    filename
  );

  const data = await fetchJson<SnapshotApiResponse>(
    params.db,
    '/api/backups/upload',
    {
      body: form,
      method: 'POST',
    }
  );
  return data.snapshot;
}

export async function listDatabaseSnapshots(params: {
  db: Database;
}): Promise<RemoteSnapshotRecord[]> {
  const data = await fetchJson<SnapshotListResponse>(
    params.db,
    '/api/backups',
    {
      method: 'GET',
    }
  );
  return data.snapshots;
}

export async function getDatabaseSnapshotDownloadUrl(params: {
  db: Database;
  snapshotId: string;
}): Promise<SnapshotDownloadUrlResponse> {
  return await fetchJson<SnapshotDownloadUrlResponse>(
    params.db,
    `/api/backups/${params.snapshotId}/download-url`,
    {
      method: 'GET',
    }
  );
}

export async function downloadDatabaseSnapshot(params: {
  db: Database;
  snapshotId: string;
}): Promise<DatabaseSnapshot> {
  const download = await getDatabaseSnapshotDownloadUrl(params);
  const response = await fetch(download.url);
  if (!response.ok) {
    throw new Error(`Failed to download snapshot: ${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentHash = await sha256Hex(bytes);
  if (contentHash !== download.snapshot.contentHash) {
    throw new Error('Downloaded snapshot failed content hash verification.');
  }
  return parseDatabaseSnapshot(bytes);
}
