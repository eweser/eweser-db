import * as Y from 'yjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Note } from '@eweser/shared';
import type { Database, YDoc } from '../index';
import { Room, roomToServerRoom } from '../room';
import {
  deleteRoom,
  getActiveRegistryRooms,
  getRoomDeletionEligibility,
  type RoomDeletionError,
} from './deleteRoom';

const setLocalRegistryMock = vi.fn();

vi.mock('../utils/localStorageService', () => ({
  setLocalRegistry: () => setLocalRegistryMock,
}));

function setupRoom({
  roomId = 'room-1',
  initial = false,
  pending = true,
  userId = '',
  adminAccess = [],
  syncUrl = null,
  encryption = null,
  online = false,
}: {
  roomId?: string;
  initial?: boolean;
  pending?: boolean;
  userId?: string;
  adminAccess?: string[];
  syncUrl?: string | null;
  encryption?: ConstructorParameters<typeof Room<Note>>[0]['encryption'];
  online?: boolean;
} = {}) {
  const clearData = vi.fn().mockResolvedValue(undefined);
  const destroy = vi.fn();
  const db = {
    authServer: 'https://auth.example.test',
    userId,
    online,
    collections: { notes: {} },
    registry: [],
    _initialRoomIds: new Set(initial ? [roomId] : []),
    _pendingRegistryRoomIds: new Set(pending ? [roomId] : []),
    getToken: vi.fn(() => (online ? 'token' : '')),
    syncRegistry: vi.fn().mockResolvedValue(true),
    warn: vi.fn(),
  } as unknown as Database;
  const room = new Room<Note>({
    db,
    id: roomId,
    name: 'Test vault',
    collectionKey: 'notes',
    adminAccess,
    syncUrl,
    encryption,
    ydoc: new Y.Doc() as YDoc<Note>,
    indexedDbProvider: { clearData, destroy } as never,
  });
  db.collections.notes[room.id] = room;
  db.registry = [roomToServerRoom(room)];

  return { db, room, clearData, destroy };
}

describe('getRoomDeletionEligibility', () => {
  it('allows an empty local vault', () => {
    const { db, room } = setupRoom();

    expect(getRoomDeletionEligibility(db)(room)).toEqual({
      canDelete: true,
      noteCount: 0,
    });
  });

  it('counts real undeleted Yjs documents and blocks a non-empty vault', () => {
    const { db, room } = setupRoom();
    room.getDocuments().new({ text: '# Keep me' });

    expect(getRoomDeletionEligibility(db)(room)).toEqual({
      canDelete: false,
      code: 'not-empty',
      reason: 'Move or delete its 1 note first.',
      noteCount: 1,
    });
  });

  it('blocks protected, locked, and non-admin vaults with specific reasons', () => {
    const protectedRoom = setupRoom({ initial: true });
    expect(
      getRoomDeletionEligibility(protectedRoom.db)(protectedRoom.room)
    ).toMatchObject({
      canDelete: false,
      code: 'protected',
    });

    const lockedRoom = setupRoom({
      encryption: {
        encrypted: true,
        algorithm: 'AES-256-GCM',
        keyDerivation: { method: 'PBKDF2', iterations: 600_000, salt: 'salt' },
        ivLength: 12,
      },
    });
    expect(
      getRoomDeletionEligibility(lockedRoom.db)(lockedRoom.room)
    ).toMatchObject({
      canDelete: false,
      code: 'locked',
    });

    const collaboratorRoom = setupRoom({
      pending: false,
      userId: 'collaborator',
      adminAccess: ['admin'],
      syncUrl: 'wss://sync.example.test',
    });
    expect(
      getRoomDeletionEligibility(collaboratorRoom.db)(collaboratorRoom.room)
    ).toMatchObject({ canDelete: false, code: 'not-admin' });
  });
});

describe('deleteRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists an offline tombstone, unloads the room, and clears its empty cache', async () => {
    const { db, room, clearData, destroy } = setupRoom();

    await deleteRoom(db)(room);

    expect(db.registry[0]?._deleted).toBe(true);
    expect(db._pendingRegistryRoomIds).not.toContain(room.id);
    expect(db.collections.notes).not.toHaveProperty(room.id);
    expect(setLocalRegistryMock).toHaveBeenCalledWith(db.registry);
    expect(clearData).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
    expect(db.syncRegistry).not.toHaveBeenCalled();
  });

  it('reports an authoritative server rejection', async () => {
    const { db, room } = setupRoom({
      pending: false,
      online: true,
      userId: 'admin',
      adminAccess: ['admin'],
      syncUrl: 'wss://sync.example.test',
    });
    vi.mocked(db.syncRegistry).mockImplementation(async () => {
      db.registry = [{ ...roomToServerRoom(room), _deleted: false }];
      return false;
    });

    await expect(deleteRoom(db)(room)).rejects.toEqual(
      expect.objectContaining<Partial<RoomDeletionError>>({
        code: 'rejected',
      })
    );
  });

  it('keeps deletion successful when empty cache cleanup fails', async () => {
    const { db, room, clearData, destroy } = setupRoom();
    clearData.mockRejectedValueOnce(new Error('IndexedDB unavailable'));

    await expect(deleteRoom(db)(room)).resolves.toBeUndefined();
    expect(db.warn).toHaveBeenCalledWith(
      'Could not clear the deleted room cache',
      room.id,
      expect.any(Error)
    );
    expect(destroy).toHaveBeenCalledOnce();
  });
});

describe('getActiveRegistryRooms', () => {
  it('keeps tombstones persisted but excludes them from startup loading', () => {
    const { room } = setupRoom();
    const active = roomToServerRoom(room);
    const deleted = { ...active, id: 'deleted-room', _deleted: true };

    expect(getActiveRegistryRooms([active, deleted], new Set())).toEqual([
      active,
    ]);
  });
});
