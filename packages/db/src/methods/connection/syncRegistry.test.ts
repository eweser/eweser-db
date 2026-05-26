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
});
