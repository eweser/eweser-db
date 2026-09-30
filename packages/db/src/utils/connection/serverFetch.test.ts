import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Database } from '../../index.js';
import { serverFetch } from './serverFetch.js';

afterEach(() => vi.unstubAllGlobals());

describe('serverFetch', () => {
  it('uses the browser API proxy without changing the canonical auth origin', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      json: async () => ({ rooms: [] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const db = {
      authServer: 'https://auth.example.test',
      apiServer: 'https://notes.example.test',
      getToken: () => null,
      error: vi.fn(),
    } as unknown as Database;

    await serverFetch(db)('/api/access-grant/sync-registry');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://notes.example.test/api/access-grant/sync-registry',
      expect.any(Object)
    );
    expect(db.authServer).toBe('https://auth.example.test');
  });
});
