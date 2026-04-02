import type { Room } from '../../db/schema/rooms.js';
import { generateSyncToken } from '../sync-token.js';
import { env } from '../../env.js';

export interface SyncConnectionInfo {
  syncUrl: string;
  syncBaseUrl: string;
  tokenExpiry: string;
  token: string;
}

/**
 * Generates a fresh Hocuspocus auth token for a room.
 * Tokens are generated on demand and are not stored in the DB.
 */
export function getRefreshedSyncToken(room: Room): SyncConnectionInfo {
  const { token, expiry } = generateSyncToken(room.id);
  const syncBaseUrl = env.SYNC_SERVER_URL;
  const syncUrl = room.syncUrl ?? syncBaseUrl;
  return {
    syncUrl,
    syncBaseUrl,
    tokenExpiry: expiry.toISOString(),
    token,
  };
}
