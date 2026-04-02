import { describe, expect, it, vi } from 'vitest';
import { login } from './login';
import type { Database } from '../..';

const { pollConnectionMock } = vi.hoisted(() => ({
  pollConnectionMock: vi.fn(),
}));

vi.mock('../../utils/connection/pollConnection', () => ({
  pollConnection: pollConnectionMock,
}));

describe('login', () => {
  it('throws when no token is available', async () => {
    const db = {
      emit: vi.fn(),
      getToken: vi.fn().mockReturnValue(''),
    } as unknown as Database;

    await expect(login(db)(undefined)).rejects.toThrow('No token found');
  });

  it('throws when syncRegistry fails', async () => {
    const db = {
      emit: vi.fn(),
      getToken: vi.fn().mockReturnValue('token'),
      syncRegistry: vi.fn().mockResolvedValue(false),
    } as unknown as Database;

    await expect(login(db)(undefined)).rejects.toThrow(
      'Failed to sync registry'
    );
  });

  it('enables sync and optionally loads all rooms', async () => {
    const db = {
      useSync: false,
      registry: [{ id: 'room-1' }],
      emit: vi.fn(),
      getToken: vi.fn().mockReturnValue('token'),
      syncRegistry: vi.fn().mockResolvedValue(true),
      loadRooms: vi.fn().mockResolvedValue(undefined),
    } as unknown as Database;

    const result = await login(db)({ loadAllRooms: true });

    expect(result).toBe(true);
    expect(db.useSync).toBe(true);
    expect(pollConnectionMock).toHaveBeenCalledWith(db);
    expect(db.loadRooms).toHaveBeenCalledWith(db.registry);
    expect(db.emit).toHaveBeenCalledWith('onLoggedInChange', true);
  });
});
