import type { Database, ServerRoom } from '@eweser/db';
import { describe, expect, it, vi } from 'vitest';
import { loginWithPrioritizedNoteSync } from './prioritized-room-sync';

function makeRegistryRoom(
  id: string,
  collectionKey: ServerRoom['collectionKey'] = 'notes'
) {
  return { id, collectionKey } as ServerRoom;
}

function makeDatabase({
  loginResult = true,
  registry = [],
  loadRoom = vi.fn().mockResolvedValue(undefined),
  loadRooms = vi.fn().mockResolvedValue(undefined),
}: {
  loginResult?: boolean;
  registry?: ServerRoom[];
  loadRoom?: ReturnType<typeof vi.fn>;
  loadRooms?: ReturnType<typeof vi.fn>;
} = {}) {
  return {
    login: vi.fn().mockResolvedValue(loginResult),
    loadRoom,
    loadRooms,
    registry,
  } as unknown as Database;
}

describe('loginWithPrioritizedNoteSync', () => {
  it('starts note and profile rooms before loading the full registry', async () => {
    const events: string[] = [];
    const firstRoom = makeRegistryRoom('first-note');
    const secondRoom = makeRegistryRoom('second-note');
    const profileRoom = makeRegistryRoom('profile', 'profiles');
    const loadRoom = vi.fn().mockImplementation(async (room: ServerRoom) => {
      events.push(room.id);
    });
    const loadRooms = vi.fn().mockImplementation(async () => {
      events.push('registry');
    });
    const database = makeDatabase({
      registry: [profileRoom, firstRoom, secondRoom],
      loadRoom,
      loadRooms,
    });

    await expect(loginWithPrioritizedNoteSync(database, vi.fn())).resolves.toBe(
      true
    );

    expect(database.login).toHaveBeenCalledWith({ loadAllRooms: false });
    expect(loadRoom).toHaveBeenCalledTimes(3);
    expect(loadRoom).toHaveBeenNthCalledWith(1, profileRoom, {
      loadRemote: true,
      awaitLoadRemote: false,
    });
    expect(loadRoom).toHaveBeenNthCalledWith(2, firstRoom, {
      loadRemote: true,
      awaitLoadRemote: false,
    });
    expect(loadRoom).toHaveBeenNthCalledWith(3, secondRoom, {
      loadRemote: true,
      awaitLoadRemote: false,
    });
    expect(events).toEqual([
      'profile',
      'first-note',
      'second-note',
      'registry',
    ]);
    expect(loadRooms).toHaveBeenCalledWith(database.registry, true);
  });

  it('continues when one note room fails to start', async () => {
    const failedRoom = makeRegistryRoom('failed-note');
    const availableRoom = makeRegistryRoom('available-note');
    const loadRoom = vi
      .fn()
      .mockRejectedValueOnce(new Error('room unavailable'))
      .mockResolvedValueOnce(undefined);
    const loadRooms = vi.fn().mockResolvedValue(undefined);
    const database = makeDatabase({
      registry: [failedRoom, availableRoom],
      loadRoom,
      loadRooms,
    });

    await expect(loginWithPrioritizedNoteSync(database, vi.fn())).resolves.toBe(
      true
    );

    expect(loadRoom).toHaveBeenCalledTimes(2);
    expect(loadRoom).toHaveBeenLastCalledWith(
      availableRoom,
      expect.any(Object)
    );
    expect(loadRooms).toHaveBeenCalledOnce();
  });

  it('does not load rooms when authentication fails', async () => {
    const loadRoom = vi.fn();
    const loadRooms = vi.fn();
    const database = makeDatabase({
      loginResult: false,
      registry: [makeRegistryRoom('note')],
      loadRoom,
      loadRooms,
    });

    await expect(loginWithPrioritizedNoteSync(database, vi.fn())).resolves.toBe(
      false
    );

    expect(loadRoom).not.toHaveBeenCalled();
    expect(loadRooms).not.toHaveBeenCalled();
  });

  it('reports a background registry load failure', async () => {
    const error = new Error('registry unavailable');
    const onError = vi.fn();
    const database = makeDatabase({
      loadRooms: vi.fn().mockRejectedValue(error),
    });

    await loginWithPrioritizedNoteSync(database, onError);
    await Promise.resolve();

    expect(onError).toHaveBeenCalledWith(error);
  });
});
