import type { Room } from '../../types';
import type { RefreshYSweetTokenRouteResponse } from '@eweser/shared';
import type { Database } from '../..';

export const refreshYSweetToken =
  (db: Database) =>
  async (room: Room<any>): Promise<RefreshYSweetTokenRouteResponse | null> => {
    const { data: refreshed } =
      await db.serverFetch<RefreshYSweetTokenRouteResponse>(
        `/access-grant/refresh-y-sweet-token/${room.id}`,
        undefined,
        room.connectAbortController
      );

    return refreshed;
  };
