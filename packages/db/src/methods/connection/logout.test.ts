import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../..';
import { logout, logoutAndClear } from './logout';

describe('logout', () => {
  it('removes the cached identity used for offline room access', () => {
    const removeItem = vi.fn();
    const db = {
      localStorageService: { removeItem },
      userId: 'owner-1',
      registry: [],
      emit: vi.fn(),
    } as unknown as Database;

    logout(db)();

    expect(db.userId).toBe('');
    expect(removeItem).toHaveBeenCalledWith('user_id');
  });
});

describe('logoutAndClear', () => {
  it('waits for IndexedDB clearing before it destroys providers', async () => {
    const events: string[] = [];
    let finishClear: (() => void) | undefined;
    const clearData = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishClear = () => {
            events.push('cleared');
            resolve();
          };
        })
    );
    const destroy = vi.fn(() => events.push('destroyed'));
    const db = {
      logout: vi.fn(() => events.push('logged-out')),
      collectionKeys: ['notes'],
      getRooms: vi.fn(() => [{ indexedDbProvider: { clearData, destroy } }]),
      registry: [{ id: 'room-1' }],
      localStorageService: { removeItem: vi.fn() },
    } as unknown as Database;

    const clearing = logoutAndClear(db)();
    await Promise.resolve();

    expect(events).toEqual(['logged-out']);
    expect(db.registry).toHaveLength(1);

    finishClear?.();
    await clearing;

    expect(events).toEqual(['logged-out', 'cleared', 'destroyed']);
    expect(db.registry).toEqual([]);
  });
});
