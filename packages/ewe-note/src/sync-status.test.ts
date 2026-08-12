import { describe, expect, it } from 'vitest';

import { deriveSyncStatus } from './sync-status';

describe('deriveSyncStatus', () => {
  it('reports synced when a connected room exists alongside background connections', () => {
    expect(
      deriveSyncStatus({
        loaded: true,
        loggedIn: true,
        hasToken: true,
        browserOnline: true,
        dbStatus: {
          online: true,
          hasToken: true,
          connectedRoomsCount: 2,
          connectingRoomsCount: 1,
        },
      })
    ).toBe('synced');
  });

  it('reports connecting until the first room connects', () => {
    expect(
      deriveSyncStatus({
        loaded: true,
        loggedIn: true,
        hasToken: true,
        browserOnline: true,
        dbStatus: {
          online: true,
          hasToken: true,
          connectedRoomsCount: 0,
          connectingRoomsCount: 1,
        },
      })
    ).toBe('connecting');
  });
});
