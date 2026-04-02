import { Hono } from 'hono';
import { requireJwtAuth } from '../middleware/jwt-auth.js';
import { requireAuth } from '../middleware/auth.js';
import { syncRoomsWithClient } from '../services/rooms/sync-rooms-with-client.js';
import { getRoomsByIds, updateRoom } from '../model/rooms/calls.js';
import { createRoomInviteLink } from '../services/access-grant/create-room-invite-link.js';
import { verifyRoomInviteToken } from '../services/access-grant/create-room-invite-link.js';
import { generateSyncToken } from '../services/sync-token.js';
import { env } from '../env.js';
import {
  acceptRoomInvite,
  notAdminOfRoomError,
  roomNotFoundError,
} from '../services/access-grant/accept-room-invite.js';
import {
  createOrUpdateThirdPartyAppPermissions,
  type ThirdPartyAppPermissions,
} from '../services/access-grant/create-third-party-app-permissions.js';
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
 * POST /api/access-grant/permissions
 * Creates or updates a third-party app grant for the signed-in user.
 */
accessGrantRouter.post('/permissions', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as ThirdPartyAppPermissions & {
    redirect?: string;
  };

  if (!body.domain || !body.redirect) {
    return c.json({ error: 'Invalid request' }, 400);
  }

  const token = await createOrUpdateThirdPartyAppPermissions({
    collections: body.collections,
    domain: body.domain,
    roomIds: body.roomIds,
    userId: user.id,
    ...(typeof body.keepAliveDays === 'number'
      ? { keepAliveDays: body.keepAliveDays }
      : {}),
  });

  const redirectUrl = new URL(body.redirect);
  redirectUrl.searchParams.set('token', token);

  return c.json({ redirectUrl: redirectUrl.toString() });
});

/**
 * POST /api/access-grant/accept-room-invite
 * Accepts a room invite for the signed-in user.
 */
accessGrantRouter.post('/accept-room-invite', requireAuth, async (c) => {
  const user = c.get('user');
  const body = (await c.req.json()) as { token?: string };

  if (!body.token) {
    return c.json({ error: 'No token provided' }, 400);
  }

  let invite;
  try {
    invite = verifyRoomInviteToken(body.token);
  } catch {
    return c.json({ error: 'Invalid invite token' }, 400);
  }

  const {
    accessType,
    domain,
    expiry,
    invitees,
    inviterId,
    redirect,
    redirectQueries,
    roomId,
  } = invite;

  if (!inviterId || !roomId || !accessType || !redirect || !domain) {
    return c.json({ error: 'Invalid invite' }, 400);
  }

  if (inviterId === user.id) {
    return c.json({ error: 'You cannot invite yourself' }, 400);
  }

  if (invitees.length > 0 && !invitees.includes(user.id)) {
    return c.json({ error: 'You are not invited to this room' }, 403);
  }

  if (expiry && new Date(expiry) < new Date()) {
    return c.json({ error: 'Invite has expired' }, 400);
  }

  try {
    await acceptRoomInvite({
      accessType,
      inviterId,
      roomId,
      userId: user.id,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === roomNotFoundError) {
        return c.json({ error: roomNotFoundError }, 404);
      }
      if (error.message === notAdminOfRoomError) {
        return c.json({ error: notAdminOfRoomError }, 403);
      }
      return c.json({ error: error.message }, 400);
    }
    return c.json({ error: 'Failed to accept invite' }, 500);
  }

  const protocol = env.AUTH_SERVER_URL.startsWith('https') ? 'https' : 'http';
  const redirectUrl = new URL(redirect, `${protocol}://${domain}`);
  if (redirectQueries) {
    Object.entries(redirectQueries).forEach(([key, value]) => {
      redirectUrl.searchParams.set(key, value);
    });
  }

  return c.json({ redirectUrl: redirectUrl.toString() });
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
