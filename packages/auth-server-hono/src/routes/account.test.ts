import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockGetSession = vi.fn();
const mockGetAccessGrantById = vi.fn();
const mockGetAccessGrantsByOwnerId = vi.fn();
const mockCreateAccessGrantId = vi.fn();
const mockParseAccessGrantId = vi.fn();
const mockRevokeAccessGrantForOwner = vi.fn();
const mockGetRoomsFromAccessGrant = vi.fn();
const mockGetUserCount = vi.fn();
const mockGetUserById = vi.fn();
const mockEnsureUserRooms = vi.fn();
const mockGetStorageProviderProfile = vi.fn();

vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_DOMAIN: 'auth.local',
    AUTH_TRUSTED_ORIGINS: ['https://note.local', 'https://other-trusted.local'],
  },
}));

vi.mock('../middleware/jwt-auth.js', () => ({
  requireJwtAuth: async (
    c: {
      req: { header: (name: string) => string | undefined };
      set: (key: string, value: unknown) => void;
      json: (body: unknown, status: number) => Response;
    },
    next: () => Promise<void>
  ) => {
    const accessGrantId = c.req.header('X-Test-Access-Grant-Id');
    if (!accessGrantId) {
      return c.json({ error: 'No token provided' }, 401);
    }
    c.set('access_grant_id', accessGrantId);
    c.set('roomIds', []);
    await next();
  },
}));

vi.mock('../auth.js', () => ({
  auth: {
    api: { getSession: mockGetSession },
    $Infer: { Session: {} },
  },
}));

vi.mock('../model/access_grants.js', () => ({
  createAccessGrantId: mockCreateAccessGrantId,
  getAccessGrantById: mockGetAccessGrantById,
  getAccessGrantsByOwnerId: mockGetAccessGrantsByOwnerId,
  parseAccessGrantId: mockParseAccessGrantId,
  revokeAccessGrantForOwner: mockRevokeAccessGrantForOwner,
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomsFromAccessGrant: mockGetRoomsFromAccessGrant,
}));

vi.mock('../model/users.js', () => ({
  getUserById: mockGetUserById,
  getUserCount: mockGetUserCount,
}));

vi.mock('../services/account/create-user-rooms.js', () => ({
  ensureUserRoomsAndAuthServerAccess: mockEnsureUserRooms,
}));

vi.mock('../lib/storage.js', () => ({
  getStorageProviderProfile: mockGetStorageProviderProfile,
}));

const { accountRouter } = await import('./account.js');

describe('accountRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/account', accountRouter);
    vi.clearAllMocks();
    mockCreateAccessGrantId.mockReturnValue('user-1|auth.local');
    mockEnsureUserRooms.mockResolvedValue({ grantId: 'user-1|auth.local' });
    mockGetUserById.mockResolvedValue({
      twoFactorEnabled: false,
    });
    mockGetStorageProviderProfile.mockReturnValue({
      configured: true,
      id: 'railway-buckets',
      kind: 's3-compatible',
      label: 'Railway Buckets',
      maxFileSizeMb: 100,
    });
    mockParseAccessGrantId.mockImplementation((id: string) => {
      const [ownerId, requesterId] = id.split('|');
      return { ownerId, requesterId };
    });
  });

  it('should return 401 when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const response = await app.fetch(
      new Request('http://localhost/api/account/bootstrap')
    );

    expect(response.status).toBe(401);
  });

  it('should return bootstrap data for the signed-in user', async () => {
    const accessGrant = { id: 'grant-1' };
    const rooms = [
      { id: 'room-1', collectionKey: 'profiles', name: 'Public Profile' },
      { id: 'room-2', collectionKey: 'profiles', name: 'Private Profile' },
      { id: 'room-3', collectionKey: 'notes', name: 'Notes' },
    ];

    mockGetSession.mockResolvedValueOnce({
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
    });
    mockGetUserById.mockResolvedValueOnce({ twoFactorEnabled: true });
    mockGetAccessGrantById.mockResolvedValue(accessGrant);
    mockGetRoomsFromAccessGrant.mockResolvedValue(rooms);
    mockGetUserCount.mockResolvedValue(7);

    const response = await app.fetch(
      new Request('http://localhost/api/account/bootstrap')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe('user-1');
    expect(body.user.twoFactorEnabled).toBe(true);
    expect(body.profileRooms).toHaveLength(2);
    expect(body.rooms).toHaveLength(3);
    expect(body.storageProviderProfile).toEqual(
      expect.objectContaining({
        configured: true,
        id: 'railway-buckets',
      })
    );
    expect(body.userCount).toBe(7);
    expect(mockEnsureUserRooms).toHaveBeenCalledWith('user-1');
  });

  it('should ensure starter rooms before loading the auth-server access grant', async () => {
    const accessGrant = { id: 'grant-1' };

    mockGetSession.mockResolvedValueOnce({
      user: {
        email: 'test@example.com',
        emailVerified: false,
        id: 'user-1',
        image: null,
        name: null,
      },
    });
    mockGetAccessGrantById.mockResolvedValue(accessGrant);
    mockGetRoomsFromAccessGrant.mockResolvedValue([]);
    mockGetUserCount.mockResolvedValue(1);

    const response = await app.fetch(
      new Request('http://localhost/api/account/bootstrap')
    );

    expect(response.status).toBe(200);
    expect(mockEnsureUserRooms).toHaveBeenCalledWith('user-1');
  });

  it('returns minimal identity to the trusted app that owns the grant', async () => {
    mockGetAccessGrantById.mockResolvedValue({
      id: 'user-1|note.local',
      isValid: true,
      ownerId: 'user-1',
      requesterId: 'note.local',
      requesterType: 'app',
    });
    mockGetUserById.mockResolvedValue({
      email: 'test@example.com',
      id: 'user-1',
      image: 'https://images.example/avatar.png',
      name: 'Test User',
      passwordHash: 'must-not-leak',
      rooms: ['room-1'],
    });

    const response = await app.fetch(
      new Request('http://localhost/api/account/identity', {
        headers: {
          Origin: 'https://note.local',
          'X-Test-Access-Grant-Id': 'user-1|note.local',
        },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toEqual({
      user: {
        email: 'test@example.com',
        image: 'https://images.example/avatar.png',
        name: 'Test User',
      },
    });
    expect(JSON.stringify(body)).not.toContain('must-not-leak');
    expect(JSON.stringify(body)).not.toContain('room-1');
  });

  it('rejects identity requests from untrusted or mismatched origins', async () => {
    mockGetAccessGrantById.mockResolvedValue({
      id: 'user-1|note.local',
      isValid: true,
      ownerId: 'user-1',
      requesterId: 'note.local',
      requesterType: 'app',
    });

    const untrusted = await app.fetch(
      new Request('http://localhost/api/account/identity', {
        headers: {
          Origin: 'https://evil.example',
          'X-Test-Access-Grant-Id': 'user-1|note.local',
        },
      })
    );
    const mismatched = await app.fetch(
      new Request('http://localhost/api/account/identity', {
        headers: {
          Origin: 'https://other-trusted.local',
          'X-Test-Access-Grant-Id': 'user-1|note.local',
        },
      })
    );

    expect(untrusted.status).toBe(403);
    expect(mismatched.status).toBe(403);
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('rejects a revoked access grant for account identity', async () => {
    mockGetAccessGrantById.mockResolvedValue({
      id: 'user-1|note.local',
      isValid: false,
      ownerId: 'user-1',
      requesterId: 'note.local',
      requesterType: 'app',
    });

    const response = await app.fetch(
      new Request('http://localhost/api/account/identity', {
        headers: {
          Origin: 'https://note.local',
          'X-Test-Access-Grant-Id': 'user-1|note.local',
        },
      })
    );

    expect(response.status).toBe(401);
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('lists connected app grants without exposing the auth-server self grant', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
    });
    mockGetAccessGrantsByOwnerId.mockResolvedValue([
      {
        collections: ['all'],
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        id: 'user-1|auth.local',
        isValid: true,
        keepAliveDays: 1,
        ownerId: 'user-1',
        requesterId: 'auth.local',
        requesterType: 'app',
        roomIds: [],
        updatedAt: null,
      },
      {
        collections: ['notes'],
        createdAt: new Date('2026-05-02T00:00:00.000Z'),
        id: 'user-1|note.eweser.com',
        isValid: true,
        keepAliveDays: 7,
        ownerId: 'user-1',
        requesterId: 'note.eweser.com',
        requesterType: 'app',
        roomIds: ['room-notes'],
        updatedAt: new Date('2026-05-03T00:00:00.000Z'),
      },
    ]);

    const response = await app.fetch(
      new Request('http://localhost/api/account/connected-apps')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.connectedApps).toEqual([
      {
        collections: ['notes'],
        createdAt: '2026-05-02T00:00:00.000Z',
        domain: 'note.eweser.com',
        id: 'user-1|note.eweser.com',
        keepAliveDays: 7,
        requesterType: 'app',
        roomIds: ['room-notes'],
        status: 'active',
        updatedAt: '2026-05-03T00:00:00.000Z',
      },
    ]);
  });

  it('revokes a connected app grant owned by the signed-in user', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
    });
    mockRevokeAccessGrantForOwner.mockResolvedValue({
      id: 'user-1|note.eweser.com',
      isValid: false,
    });

    const response = await app.fetch(
      new Request('http://localhost/api/account/connected-apps/revoke', {
        body: JSON.stringify({ grantId: 'user-1|note.eweser.com' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockRevokeAccessGrantForOwner).toHaveBeenCalledWith(
      'user-1|note.eweser.com',
      'user-1'
    );
    expect(body).toEqual({
      grantId: 'user-1|note.eweser.com',
      status: 'revoked',
    });
  });

  it('rejects malformed connected app revoke requests', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
    });

    const response = await app.fetch(
      new Request('http://localhost/api/account/connected-apps/revoke', {
        body: JSON.stringify({ grantId: '' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
    );

    expect(response.status).toBe(400);
    expect(mockRevokeAccessGrantForOwner).not.toHaveBeenCalled();
  });

  it('does not allow revoking the auth-server self grant', async () => {
    mockGetSession.mockResolvedValueOnce({
      user: {
        email: 'test@example.com',
        emailVerified: true,
        id: 'user-1',
        image: null,
        name: 'Test User',
      },
    });

    const response = await app.fetch(
      new Request('http://localhost/api/account/connected-apps/revoke', {
        body: JSON.stringify({ grantId: 'user-1|auth.local' }),
        headers: { 'content-type': 'application/json' },
        method: 'POST',
      })
    );

    expect(response.status).toBe(400);
    expect(mockRevokeAccessGrantForOwner).not.toHaveBeenCalled();
  });
});
