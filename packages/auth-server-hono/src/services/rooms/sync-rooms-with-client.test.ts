import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/drizzle.js', () => ({ db: {} }));
vi.mock('../../env.js', () => ({ env: {} }));
vi.mock('../../model/access_grants.js', () => ({
  parseAccessGrantId: vi.fn(),
  updateAccessGrant: vi.fn(),
}));
vi.mock('../../model/rooms/calls.js', () => ({
  getRoomsFromAccessGrant: vi.fn(),
  insertRooms: vi.fn(),
  updateRoom: vi.fn(),
}));

const { getNewClientRooms } = await import('./sync-rooms-with-client.js');

describe('getNewClientRooms', () => {
  it('does not recreate cached rooms missing from the server grant', () => {
    const staleRoom = {
      id: 'stale-room',
      name: 'Old notes',
      collectionKey: 'notes',
    };
    const newRoom = {
      id: 'new-room',
      name: 'Current notes',
      collectionKey: 'notes',
    };

    expect(
      getNewClientRooms([staleRoom, newRoom], new Set(), [newRoom.id])
    ).toEqual([newRoom]);
  });

  it('does not create a room that the client marked deleted', () => {
    const deletedRoom = {
      id: 'deleted-room',
      name: 'Deleted notes',
      collectionKey: 'notes',
      _deleted: true,
    };

    expect(
      getNewClientRooms([deletedRoom], new Set(), [deletedRoom.id])
    ).toEqual([]);
  });
});
