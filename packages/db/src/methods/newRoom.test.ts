import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newRoom } from './newRoom';
import type { Database } from '..';

const setLocalRegistryMock = vi.fn();

vi.mock('../utils/localStorageService', () => ({
  setLocalRegistry: () => setLocalRegistryMock,
}));

describe('newRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates room, updates registry and loads local room', () => {
    const db = {
      collections: { notes: {}, flashcards: {}, profiles: {} },
      registry: [],
      _pendingRegistryRoomIds: new Set<string>(),
      online: false,
      debug: vi.fn(),
      loadRoom: vi.fn(),
      syncRegistry: vi.fn(),
    } as unknown as Database;

    const created = newRoom(db)({
      id: 'room-1',
      collectionKey: 'notes',
      name: 'My Notes',
    });

    expect(created.id).toBe('room-1');
    expect(db.collections.notes['room-1']).toBeDefined();
    expect(db.registry).toHaveLength(1);
    expect(db.registry[0]?.id).toBe('room-1');
    expect(db._pendingRegistryRoomIds).toEqual(new Set(['room-1']));
    expect(setLocalRegistryMock).toHaveBeenCalledWith(db.registry);
    expect(db.loadRoom).toHaveBeenCalledWith(created);
    expect(db.syncRegistry).not.toHaveBeenCalled();
  });

  it('syncs registry when online', () => {
    const db = {
      collections: { notes: {}, flashcards: {}, profiles: {} },
      registry: [],
      _pendingRegistryRoomIds: new Set<string>(),
      online: true,
      debug: vi.fn(),
      loadRoom: vi.fn(),
      syncRegistry: vi.fn(),
    } as unknown as Database;

    newRoom(db)({
      id: 'room-online',
      collectionKey: 'notes',
      name: 'Online Room',
    });

    expect(db.syncRegistry).toHaveBeenCalled();
  });

  it('does not duplicate an existing room when an app initializes it again', () => {
    const existingRoom = {
      id: 'room-existing',
      collectionKey: 'notes' as const,
      name: 'Local notes',
    };
    const db = {
      collections: { notes: {}, flashcards: {}, profiles: {} },
      registry: [existingRoom],
      _pendingRegistryRoomIds: new Set<string>(),
      online: false,
      debug: vi.fn(),
      loadRoom: vi.fn(),
      syncRegistry: vi.fn(),
    } as unknown as Database;

    newRoom(db)(existingRoom);

    expect(db.registry).toEqual([existingRoom]);
    expect(db._pendingRegistryRoomIds).toEqual(new Set([existingRoom.id]));
    expect(setLocalRegistryMock).toHaveBeenCalledWith([existingRoom]);
  });
});
