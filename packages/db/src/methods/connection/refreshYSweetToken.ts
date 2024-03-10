import type { Room } from '../../types';
import type { RefreshYSweetTokenRouteResponse } from '@eweser/shared';
import type { Database } from '../..';

export const refreshYSweetToken =
  (db: Database) =>
  async (room: Room<any>): Promise<string | undefined> => {
    const { data: refresh } =
      await db.serverFetch<RefreshYSweetTokenRouteResponse>(
        `/access-grant/refresh-y-sweet-token/${room.id}`
      );

    if (refresh?.token && refresh.ySweetUrl) {
      room.ySweetProvider = null; // calling loadRoom with a null ySweetProvider will create a new one
      await db.loadRoom(room);
    }
    return refresh?.token;
  };
