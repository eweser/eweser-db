import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const mockGetSession = vi.fn();
const mockGetAccessGrantById = vi.fn();
const mockCreateAccessGrantId = vi.fn();
const mockGetRoomsFromAccessGrant = vi.fn();
const mockGetUserCount = vi.fn();
const mockCreateNewUserRooms = vi.fn();

vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_DOMAIN: 'auth.local',
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
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomsFromAccessGrant: mockGetRoomsFromAccessGrant,
}));

vi.mock('../model/users.js', () => ({
  getUserCount: mockGetUserCount,
}));

vi.mock('../services/account/create-user-rooms.js', () => ({
  createNewUserRoomsAndAuthServerAccess: mockCreateNewUserRooms,
}));

const { accountRouter } = await import('./account.js');

describe('accountRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/account', accountRouter);
    vi.clearAllMocks();
    mockCreateAccessGrantId.mockReturnValue('user-1|auth.local');
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
    mockGetAccessGrantById.mockResolvedValue(accessGrant);
    mockGetRoomsFromAccessGrant.mockResolvedValue(rooms);
    mockGetUserCount.mockResolvedValue(7);

    const response = await app.fetch(
      new Request('http://localhost/api/account/bootstrap')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user.id).toBe('user-1');
    expect(body.profileRooms).toHaveLength(2);
    expect(body.rooms).toHaveLength(3);
    expect(body.userCount).toBe(7);
    expect(mockCreateNewUserRooms).not.toHaveBeenCalled();
  });

  it('should create starter rooms when the auth-server access grant is missing', async () => {
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
    mockGetAccessGrantById
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce(accessGrant);
    mockGetRoomsFromAccessGrant.mockResolvedValue([]);
    mockGetUserCount.mockResolvedValue(1);

    const response = await app.fetch(
      new Request('http://localhost/api/account/bootstrap')
    );

    expect(response.status).toBe(200);
    expect(mockCreateNewUserRooms).toHaveBeenCalledWith('user-1');
  });
});
