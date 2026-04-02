import { Hono } from 'hono';
import { requireJwtAuth } from '../middleware/jwt-auth.js';
import { syncRoomsWithClient } from '../services/rooms/sync-rooms-with-client.js';
import { getRoomsByIds, updateRoom } from '../model/rooms/calls.js';
import { createRoomInviteLink } from '../services/access-grant/create-room-invite-link.js';
import { generateSyncToken } from '../services/sync-token.js';
import { env } from '../env.js';
import type {
  RegistrySyncRequestBody,
  CreateRoomInviteBody,
  UpdateRoomPostBody,
  RefreshSyncTokenRouteResponse,
} from '@eweser/shared';

export const accessGrantRouter = new Hono();

/**
 * POST /api/access-grant/sync-registry
 * Syncs client rooms with server.
 */
accessGrantRouter.post('/sync-registry', async (c) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'No token provided' }, 401);

  const body = (await c.req.json()) as RegistrySyncRequestBody;
  const result = await syncRoomsWithClient(token, body.rooms);
  return c.json(result);
});

/**
 * POST /api/access-grant/get-rooms
 * Returns rooms for a given access grant.
 */
accessGrantRouter.post('/get-rooms', requireJwtAuth, async (c) => {
  const roomIds = c.get('roomIds');
  const rooms = await getRoomsByIds(roomIds);
  return c.json(rooms);
});

/**
 * POST /api/access-grant/create-room-invite
 * Generates an invite link for a room.
 */
accessGrantRouter.post('/create-room-invite', requireJwtAuth, async (c) => {
  const body = (await c.req.json()) as CreateRoomInviteBody;
  const roomIds = c.get('roomIds');

  if (!roomIds.includes(body.roomId)) {
    return c.json({ error: 'Invalid room' }, 403);
  }

  const link = createRoomInviteLink(body);
  return c.json({ link });
});

/**
 * POST /api/access-grant/update-room/:roomId
 * Renames a room.
 */
accessGrantRouter.post('/update-room/:roomId', requireJwtAuth, async (c) => {
  const roomId = c.req.param('roomId');
  const roomIds = c.get('roomIds');
  const { newName } = (await c.req.json()) as UpdateRoomPostBody;

  if (!roomIds.includes(roomId)) {
    return c.json({ error: 'Invalid room' }, 403);
  }

  const updated = await updateRoom({ id: roomId, name: newName });
  return c.json(updated);
});

/**
 * GET /api/access-grant/refresh-sync-token/:roomId
 * Returns a fresh Hocuspocus auth token.
 */
accessGrantRouter.get(
  '/refresh-sync-token/:roomId',
  requireJwtAuth,
  async (c) => {
    const roomId = c.req.param('roomId');
    const roomIds = c.get('roomIds');

    if (!roomIds.includes(roomId)) {
      return c.json({ error: 'Invalid room' }, 403);
    }

    const { token, expiry } = generateSyncToken(roomId);

    const response: RefreshSyncTokenRouteResponse = {
      syncUrl: env.SYNC_SERVER_URL,
      syncToken: token,
      tokenExpiry: expiry.toISOString(),
    };

    return c.json(response);
  }
);
