import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../../index.js';
import { getToken } from './getToken.js';

function makeDatabase(savedToken: string, urlToken: string) {
  const removeItem = vi.fn();
  const db = {
    accessGrantToken: '',
    userId: 'previous-owner',
    getAccessGrantTokenFromUrl: () => urlToken,
    localStorageService: {
      getItem: () => savedToken,
      removeItem,
    },
    debug: vi.fn(),
  } as unknown as Database;
  return { db, removeItem };
}

describe('getToken', () => {
  it('keeps the offline identity when the URL repeats the saved grant', () => {
    const { db, removeItem } = makeDatabase('same-grant', 'same-grant');

    expect(getToken(db)()).toBe('same-grant');
    expect(db.userId).toBe('previous-owner');
    expect(removeItem).not.toHaveBeenCalled();
  });

  it('drops the offline identity when a different grant arrives', () => {
    const { db, removeItem } = makeDatabase('old-grant', 'new-grant');

    expect(getToken(db)()).toBe('new-grant');
    expect(db.userId).toBe('');
    expect(removeItem).toHaveBeenCalledWith('user_id');
  });
});
