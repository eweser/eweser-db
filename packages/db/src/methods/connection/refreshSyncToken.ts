import type { Room } from '../../types';
import type { EweDocument } from '@eweser/shared';
import type { RefreshSyncTokenRouteResponse } from '@eweser/shared';
import type { Database } from '../..';

export const refreshSyncToken =
  (db: Database) =>
  async (
    room: Room<EweDocument>
  ): Promise<RefreshSyncTokenRouteResponse | null> => {
    const { data: refreshed } =
      await db.serverFetch<RefreshSyncTokenRouteResponse>(
        `/api/access-grant/refresh-sync-token/${room.id}`,
        undefined,
        room.connectAbortController
      );

    return refreshed;
  };
