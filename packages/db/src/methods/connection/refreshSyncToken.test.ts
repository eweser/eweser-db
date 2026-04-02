import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../..';
import type { EweDocument, Room } from '../../types';
import { refreshSyncToken } from './refreshSyncToken';

describe('refreshSyncToken', () => {
  it('requests the Hono sync-token route', async () => {
    const serverFetch = vi.fn().mockResolvedValue({
      data: {
        syncUrl: 'ws://localhost:8080',
        syncToken: 'sync-token',
        tokenExpiry: '2026-04-02T00:00:00.000Z',
      },
      error: null,
    });

    const db = {
      serverFetch,
    } as unknown as Database;
    const room = {
      id: 'room-1',
      connectAbortController: new AbortController(),
    } as unknown as Room<EweDocument>;

    const result = await refreshSyncToken(db)(room);

    expect(serverFetch).toHaveBeenCalledWith(
      '/api/access-grant/refresh-sync-token/room-1',
      undefined,
      room.connectAbortController
    );
    expect(result).toEqual({
      syncUrl: 'ws://localhost:8080',
      syncToken: 'sync-token',
      tokenExpiry: '2026-04-02T00:00:00.000Z',
    });
  });
});
