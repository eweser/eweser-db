import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadRooms } from './loadRooms';
import type { Database } from '../..';

const { waitMock } = vi.hoisted(() => ({
  waitMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@eweser/shared', () => ({
  wait: waitMock,
}));

describe('loadRooms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads local rooms and emits roomsLoaded by default', async () => {
    const db = {
      loadRoom: vi.fn().mockResolvedValue({}),
      emit: vi.fn(),
      debug: vi.fn(),
    } as unknown as Database;

    const rooms = [{ id: 'room-1' }, { id: 'room-2' }] as never[];

    await loadRooms(db)(rooms);

    expect(db.loadRoom).toHaveBeenNthCalledWith(1, rooms[0], {
      loadRemote: false,
    });
    expect(db.loadRoom).toHaveBeenNthCalledWith(2, rooms[1], {
      loadRemote: false,
    });
    expect(db.emit).toHaveBeenCalledWith('roomsLoaded', [{}, {}]);
    expect(waitMock).not.toHaveBeenCalled();
  });

  it('loads remotes with staggering and emits roomsRemotesLoaded', async () => {
    const localRoom = { syncProvider: { status: 'disconnected' } };
    const connectedRoom = { syncProvider: { status: 'connected' } };

    const db = {
      loadRoom: vi
        .fn()
        .mockResolvedValueOnce(localRoom)
        .mockResolvedValueOnce(localRoom)
        .mockResolvedValueOnce(connectedRoom)
        .mockResolvedValueOnce(connectedRoom),
      emit: vi.fn(),
      debug: vi.fn(),
    } as unknown as Database;

    const rooms = [{ id: 'room-1' }, { id: 'room-2' }] as never[];

    await loadRooms(db)(rooms, true, 250);

    expect(db.loadRoom).toHaveBeenNthCalledWith(3, rooms[0], {
      loadRemote: true,
      awaitLoadRemote: true,
    });
    expect(db.loadRoom).toHaveBeenNthCalledWith(4, rooms[1], {
      loadRemote: true,
      awaitLoadRemote: true,
    });
    expect(waitMock).toHaveBeenCalledWith(250);
    expect(db.emit).toHaveBeenCalledWith('roomsRemotesLoaded', [
      connectedRoom,
      connectedRoom,
    ]);
  });
});
