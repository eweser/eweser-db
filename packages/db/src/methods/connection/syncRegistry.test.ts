import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncRegistry } from './syncRegistry';
import type { Database } from '../..';

const setLocalAccessGrantTokenMock = vi.fn();
const setLocalRegistryMock = vi.fn();

vi.mock('../../utils/localStorageService', () => ({
  setLocalAccessGrantToken: () => setLocalAccessGrantTokenMock,
  setLocalRegistry: () => setLocalRegistryMock,
}));

describe('syncRegistry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false when token is missing', async () => {
    const db = {
      registry: [],
      _pendingRegistryRoomIds: new Set(),
      getToken: () => '',
      emit: vi.fn(),
      serverFetch: vi.fn(),
    } as unknown as Database;

    const result = await syncRegistry(db)();

    expect(result).toBe(false);
    expect(db.serverFetch).not.toHaveBeenCalled();
  });

  it('returns false when server fetch returns error', async () => {
    const db = {
      registry: [],
      _pendingRegistryRoomIds: new Set(),
      userId: '',
      accessGrantToken: '',
      getToken: () => 'token',
      emit: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      serverFetch: vi.fn().mockResolvedValue({ data: null, error: 'boom' }),
    } as unknown as Database;

    const result = await syncRegistry(db)();

    expect(result).toBe(false);
    expect(db.emit).toHaveBeenCalledWith('registrySync', 'error', 'boom');
  });

  it('updates token, registry and userId on success with a single returned room', async () => {
    const rooms = [{ id: 'room-1', name: 'Notes', collectionKey: 'notes' }];

    const db = {
      registry: [],
      _pendingRegistryRoomIds: new Set(),
      userId: '',
      accessGrantToken: '',
      getToken: () => 'token',
      emit: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      serverFetch: vi.fn().mockResolvedValue({
        data: { rooms, token: 'next-token', userId: 'user-1' },
        error: null,
      }),
    } as unknown as Database;

    const result = await syncRegistry(db)();

    expect(result).toBe(true);
    expect(setLocalAccessGrantTokenMock).toHaveBeenCalledWith('next-token');
    expect(setLocalRegistryMock).toHaveBeenCalledWith(rooms);
    expect(db.userId).toBe('user-1');
    expect(db.accessGrantToken).toBe('next-token');
    expect(db.registry).toEqual(rooms);
  });

  it('unloads stale rooms after the server removes them while preserving current initial rooms', async () => {
    const staleRoom = {
      id: 'stale-room',
      name: 'Old synced notes',
      collectionKey: 'notes',
    };
    const localRoom = {
      id: 'local-room',
      name: 'Current local notes',
      collectionKey: 'notes',
    };
    const canonicalRoom = {
      id: 'canonical-room',
      name: 'Notes',
      collectionKey: 'notes',
    };
    const staleDisconnect = vi.fn();
    const localDisconnect = vi.fn();
    const canonicalDisconnect = vi.fn();
    const notes = {
      [staleRoom.id]: { ...staleRoom, disconnect: staleDisconnect },
      [localRoom.id]: { ...localRoom, disconnect: localDisconnect },
      [canonicalRoom.id]: {
        ...canonicalRoom,
        disconnect: canonicalDisconnect,
      },
    };
    let staleRoomPresentWhenSuccessEmitted = true;

    const db = {
      registry: [staleRoom, localRoom, canonicalRoom],
      collections: { notes },
      _initialRoomIds: new Set([localRoom.id]),
      _pendingRegistryRoomIds: new Set(),
      userId: '',
      accessGrantToken: '',
      getToken: () => 'token',
      emit: vi.fn((event: string, status: string) => {
        if (event === 'registrySync' && status === 'success') {
          staleRoomPresentWhenSuccessEmitted = staleRoom.id in notes;
        }
      }),
      info: vi.fn(),
      debug: vi.fn(),
      serverFetch: vi.fn().mockResolvedValue({
        data: {
          rooms: [canonicalRoom],
          token: 'next-token',
          userId: 'user-1',
        },
        error: null,
      }),
    } as unknown as Database;

    const result = await syncRegistry(db)();

    expect(result).toBe(true);
    expect(staleDisconnect).toHaveBeenCalledOnce();
    expect(notes).not.toHaveProperty(staleRoom.id);
    expect(localDisconnect).not.toHaveBeenCalled();
    expect(notes).toHaveProperty(localRoom.id);
    expect(canonicalDisconnect).not.toHaveBeenCalled();
    expect(notes).toHaveProperty(canonicalRoom.id);
    expect(staleRoomPresentWhenSuccessEmitted).toBe(false);
  });

  it('sends only locally created rooms as pending registrations', async () => {
    const newRoom = {
      id: 'new-room',
      name: 'New notes',
      collectionKey: 'notes',
    };
    const db = {
      registry: [newRoom],
      _pendingRegistryRoomIds: new Set([newRoom.id]),
      userId: '',
      accessGrantToken: '',
      getToken: () => 'token',
      emit: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      serverFetch: vi.fn().mockResolvedValue({
        data: { rooms: [newRoom], token: 'next-token', userId: 'user-1' },
        error: null,
      }),
    } as unknown as Database;

    await syncRegistry(db)();

    expect(db.serverFetch).toHaveBeenCalledWith(
      '/api/access-grant/sync-registry',
      {
        method: 'POST',
        body: { rooms: [newRoom], newRoomIds: [newRoom.id] },
      }
    );
    expect(db._pendingRegistryRoomIds).toEqual(new Set());
  });

  it('serializes concurrent syncs and drains a room created mid-sync', async () => {
    const firstRoom = {
      id: 'first-room',
      name: 'First notes room',
      collectionKey: 'notes',
    };
    const secondRoom = {
      id: 'second-room',
      name: 'Second notes room',
      collectionKey: 'notes',
    };
    let releaseFirstRequest = () => {};
    const firstRequestGate = new Promise<void>((resolve) => {
      releaseFirstRequest = resolve;
    });
    let requestCount = 0;
    const serverFetch = vi.fn(async () => {
      requestCount += 1;
      if (requestCount === 1) {
        await firstRequestGate;
        return {
          data: {
            rooms: [firstRoom],
            token: 'first-token',
            userId: 'user-1',
          },
          error: null,
        };
      }
      return {
        data: {
          rooms: [firstRoom, secondRoom],
          token: 'second-token',
          userId: 'user-1',
        },
        error: null,
      };
    });
    const db = {
      registry: [firstRoom],
      _initialRoomIds: new Set(),
      _pendingRegistryRoomIds: new Set([firstRoom.id]),
      userId: '',
      accessGrantToken: '',
      getToken: () => 'token',
      emit: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      serverFetch,
    } as unknown as Database;
    const runSync = syncRegistry(db);

    const firstSync = runSync();
    await vi.waitFor(() => expect(serverFetch).toHaveBeenCalledOnce());

    db.registry.push(secondRoom as Database['registry'][number]);
    db._pendingRegistryRoomIds.add(secondRoom.id);
    const concurrentSync = runSync();

    await Promise.resolve();
    expect(serverFetch).toHaveBeenCalledOnce();

    releaseFirstRequest();

    await expect(Promise.all([firstSync, concurrentSync])).resolves.toEqual([
      true,
      true,
    ]);
    expect(serverFetch).toHaveBeenCalledTimes(2);
    expect(serverFetch).toHaveBeenNthCalledWith(
      2,
      '/api/access-grant/sync-registry',
      {
        method: 'POST',
        body: {
          rooms: [firstRoom, secondRoom],
          newRoomIds: [secondRoom.id],
        },
      }
    );
    expect(db.registry).toEqual([firstRoom, secondRoom]);
    expect(db._pendingRegistryRoomIds).toEqual(new Set());
  });

  it('stops draining when the server does not accept a pending room', async () => {
    const pendingRoom = {
      id: 'pending-room',
      name: 'Pending notes room',
      collectionKey: 'notes',
    };
    const canonicalRoom = {
      id: 'canonical-room',
      name: 'Notes',
      collectionKey: 'notes',
    };
    const serverFetch = vi.fn().mockResolvedValue({
      data: {
        rooms: [canonicalRoom],
        token: 'next-token',
        userId: 'user-1',
      },
      error: null,
    });
    const db = {
      registry: [pendingRoom],
      _initialRoomIds: new Set(),
      _pendingRegistryRoomIds: new Set([pendingRoom.id]),
      userId: '',
      accessGrantToken: '',
      getToken: () => 'token',
      emit: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      serverFetch,
    } as unknown as Database;

    await expect(syncRegistry(db)()).resolves.toBe(false);

    expect(serverFetch).toHaveBeenCalledOnce();
    expect(db.registry).toEqual([canonicalRoom, pendingRoom]);
    expect(db._pendingRegistryRoomIds).toEqual(new Set([pendingRoom.id]));
  });
});
