import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { Context, Next } from 'hono';

const syncRoomsWithClientMock = vi.fn();
const getRoomsByIdsMock = vi.fn();
const updateRoomMock = vi.fn();
const createRoomInviteLinkMock = vi.fn();
const verifyRoomInviteTokenMock = vi.fn();
const acceptRoomInviteMock = vi.fn();
const createOrUpdateThirdPartyAppPermissionsMock = vi.fn();
const generateSyncTokenMock = vi.fn();

vi.mock('../middleware/jwt-auth.js', () => ({
  requireJwtAuth: async (c: Context, next: Next) => {
    c.set('roomIds', ['room-1', 'room-2']);
    c.set('access_grant_id', 'grant-1');
    await next();
  },
}));

vi.mock('../middleware/auth.js', () => ({
  requireAuth: async (c: Context, next: Next) => {
    c.set('user', { id: 'user-1' });
    await next();
  },
}));

vi.mock('../services/rooms/sync-rooms-with-client.js', () => ({
  syncRoomsWithClient: syncRoomsWithClientMock,
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomsByIds: getRoomsByIdsMock,
  updateRoom: updateRoomMock,
}));

vi.mock('../services/access-grant/create-room-invite-link.js', () => ({
  createRoomInviteLink: createRoomInviteLinkMock,
  verifyRoomInviteToken: verifyRoomInviteTokenMock,
}));

vi.mock('../services/access-grant/accept-room-invite.js', () => ({
  acceptRoomInvite: acceptRoomInviteMock,
  roomNotFoundError: 'Room not found',
  notAdminOfRoomError: 'Inviter is not an admin of this room',
}));

vi.mock(
  '../services/access-grant/create-third-party-app-permissions.js',
  () => ({
    createOrUpdateThirdPartyAppPermissions:
      createOrUpdateThirdPartyAppPermissionsMock,
  })
);

vi.mock('../services/sync-token.js', () => ({
  generateSyncToken: generateSyncTokenMock,
}));

vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_URL: 'http://localhost:38101',
    SYNC_SERVER_URL: 'ws://localhost:8080',
  },
}));

const { accessGrantRouter } = await import('./access-grant.js');

describe('accessGrantRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/access-grant', accessGrantRouter);
    vi.clearAllMocks();
  });

  it('returns 401 on sync-registry when auth header is missing', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/sync-registry', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rooms: [] }),
      })
    );

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: 'No token provided' });
  });

  it('syncs registry with token and rooms payload', async () => {
    syncRoomsWithClientMock.mockResolvedValueOnce({
      rooms: [],
      token: 'next-token',
      userId: 'user-1',
    });

    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/sync-registry', {
        method: 'POST',
        headers: {
          authorization: 'Bearer access-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ rooms: [{ id: 'room-1' }] }),
      })
    );

    expect(syncRoomsWithClientMock).toHaveBeenCalledWith('access-token', [
      { id: 'room-1' },
    ]);
    expect(res.status).toBe(200);
  });

  it('returns 403 when creating invite for a room not in JWT', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/create-room-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomId: 'room-999' }),
      })
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid room' });
  });

  it('returns link when creating room invite for authorized room', async () => {
    createRoomInviteLinkMock.mockReturnValueOnce('http://invite/link');

    const body = {
      roomId: 'room-1',
      accessType: 'write',
      redirect: '/done',
      domain: 'example.com',
      collections: ['all'],
      name: 'Example App',
      invitees: [],
    };

    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/create-room-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    );

    expect(createRoomInviteLinkMock).toHaveBeenCalledWith(body);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ link: 'http://invite/link' });
  });

  it('returns 400 for invalid permissions payload', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/permissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ roomIds: [] }),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid request' });
  });

  it('returns redirect url with token for permissions submit', async () => {
    createOrUpdateThirdPartyAppPermissionsMock.mockResolvedValueOnce(
      'grant-token'
    );

    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/permissions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          domain: 'example.com',
          redirect: 'https://example.com/callback',
          roomIds: ['room-1'],
          collections: ['all'],
          keepAliveDays: 3,
        }),
      })
    );

    expect(createOrUpdateThirdPartyAppPermissionsMock).toHaveBeenCalledWith({
      domain: 'example.com',
      roomIds: ['room-1'],
      collections: ['all'],
      keepAliveDays: 3,
      userId: 'user-1',
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      redirectUrl: 'https://example.com/callback?token=grant-token',
    });
  });

  it('returns 400 when invite token is missing', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/accept-room-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: 'No token provided' });
  });

  it('returns 403 when invitee is not allowed', async () => {
    verifyRoomInviteTokenMock.mockReturnValueOnce({
      roomId: 'room-1',
      inviterId: 'owner-1',
      accessType: 'write',
      domain: 'example.com',
      redirect: '/accepted',
      invitees: ['another-user'],
      expiry: new Date(Date.now() + 60_000).toISOString(),
      redirectQueries: { from: 'invite' },
    });

    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/accept-room-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'invite-token' }),
      })
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: 'You are not invited to this room',
    });
  });

  it('accepts invite and returns computed redirect URL', async () => {
    verifyRoomInviteTokenMock.mockReturnValueOnce({
      roomId: 'room-1',
      inviterId: 'owner-1',
      accessType: 'write',
      domain: 'example.com',
      redirect: '/accepted',
      invitees: [],
      expiry: new Date(Date.now() + 60_000).toISOString(),
      redirectQueries: { from: 'invite' },
    });

    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/accept-room-invite', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'invite-token' }),
      })
    );

    expect(acceptRoomInviteMock).toHaveBeenCalledWith({
      roomId: 'room-1',
      inviterId: 'owner-1',
      accessType: 'write',
      userId: 'user-1',
    });
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      redirectUrl: 'http://example.com/accepted?from=invite',
    });
  });

  it('returns 403 when updating room outside JWT room list', async () => {
    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/update-room/room-999', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newName: 'Renamed' }),
      })
    );

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: 'Invalid room' });
  });

  it('refreshes sync token for authorized room', async () => {
    generateSyncTokenMock.mockReturnValueOnce({
      token: 'sync-token',
      expiry: new Date('2026-04-03T00:00:00.000Z'),
    });

    const res = await app.fetch(
      new Request('http://localhost/api/access-grant/refresh-sync-token/room-1')
    );

    expect(generateSyncTokenMock).toHaveBeenCalledWith('room-1');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      syncUrl: 'ws://localhost:8080',
      syncToken: 'sync-token',
      tokenExpiry: '2026-04-03T00:00:00.000Z',
    });
  });
});
