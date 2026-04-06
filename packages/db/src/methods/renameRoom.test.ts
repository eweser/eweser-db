import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renameRoom } from './renameRoom';
import type { Database } from '..';
import type { EweDocument, Room } from '../types';

const setLocalRegistryMock = vi.fn();

vi.mock('../utils/localStorageService', () => ({
  setLocalRegistry: () => setLocalRegistryMock,
}));

describe('renameRoom', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates room and registry when server responds with new name', async () => {
    const room = {
      id: 'room-1',
      name: 'Old Name',
    } as unknown as Room<EweDocument>;
    const db = {
      registry: [{ id: 'room-1', name: 'Old Name' }],
      serverFetch: vi.fn().mockResolvedValue({
        data: { id: 'room-1', name: 'New Name' },
        error: null,
      }),
      debug: vi.fn(),
      error: vi.fn(),
    } as unknown as Database;

    const result = await renameRoom(db)(room, 'New Name');

    expect(db.serverFetch).toHaveBeenCalledWith(
      '/api/access-grant/update-room/room-1',
      {
        method: 'POST',
        body: { newName: 'New Name' },
      }
    );
    expect(room.name).toBe('New Name');
    expect(db.registry[0]?.name).toBe('New Name');
    expect(setLocalRegistryMock).toHaveBeenCalledWith(db.registry);
    expect(result).toEqual({ id: 'room-1', name: 'New Name' });
  });

  it('logs error and leaves room unchanged when server returns error', async () => {
    const room = {
      id: 'room-1',
      name: 'Old Name',
    } as unknown as Room<EweDocument>;
    const db = {
      registry: [{ id: 'room-1', name: 'Old Name' }],
      serverFetch: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'forbidden' },
      }),
      debug: vi.fn(),
      error: vi.fn(),
    } as unknown as Database;

    const result = await renameRoom(db)(room, 'New Name');

    expect(db.error).toHaveBeenCalledWith('Error renaming room', {
      message: 'forbidden',
    });
    expect(room.name).toBe('Old Name');
    expect(setLocalRegistryMock).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
