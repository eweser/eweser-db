import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Mock shared modules
// ---------------------------------------------------------------------------

const mockGetSession = vi.fn();

vi.mock('../env.js', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    SERVER_SECRET: 'test-secret',
    PORT: 3000,
    BETTER_AUTH_SECRET: 'test-auth-secret',
    BETTER_AUTH_BASE_URL: 'http://localhost:3000',
    AUTH_SERVER_DOMAIN: 'auth.local',
  },
}));

vi.mock('../auth.js', () => ({
  auth: {
    handler: vi.fn(),
    api: { getSession: mockGetSession },
    $Infer: { Session: {} },
  },
}));

const mockCreateAgentConfig = vi.fn();
const mockGetAgentConfigsByUserId = vi.fn();
const mockGetAgentConfigById = vi.fn();
const mockGetAgentConfigByTokenHash = vi.fn();
const mockRevokeAgentConfig = vi.fn();
const mockRotateAgentToken = vi.fn();
const mockDeleteAgentConfig = vi.fn();
const mockGetAgentAccessLogs = vi.fn();
const mockTouchAgentLastAccess = vi.fn();
const mockLogAgentAccess = vi.fn();
const mockHashToken = vi.fn((t: string) => `hashed:${t}`);

vi.mock('../model/agents.js', () => ({
  createAgentConfig: mockCreateAgentConfig,
  getAgentConfigsByUserId: mockGetAgentConfigsByUserId,
  getAgentConfigById: mockGetAgentConfigById,
  getAgentConfigByTokenHash: mockGetAgentConfigByTokenHash,
  revokeAgentConfig: mockRevokeAgentConfig,
  rotateAgentToken: mockRotateAgentToken,
  deleteAgentConfig: mockDeleteAgentConfig,
  getAgentAccessLogs: mockGetAgentAccessLogs,
  touchAgentLastAccess: mockTouchAgentLastAccess,
  logAgentAccess: mockLogAgentAccess,
  hashToken: mockHashToken,
  generateAgentToken: vi.fn(() => ({
    token: 'raw-token',
    hash: 'hashed-token',
  })),
}));

const mockGetRoomsByIds = vi.fn();
const mockGetUserById = vi.fn();
const mockGenerateSyncToken = vi.fn(() => ({
  token: 'sync-jwt-token',
  expiry: new Date('2026-04-04T01:00:00Z'),
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomsByIds: mockGetRoomsByIds,
}));

vi.mock('../model/users.js', () => ({
  getUserById: mockGetUserById,
}));

vi.mock('../services/sync-token.js', () => ({
  generateSyncToken: mockGenerateSyncToken,
}));

const { agentsRouter } = await import('./agents.js');

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  image: null,
};

function makeApp() {
  const app = new Hono();
  app.route('/api/agents', agentsRouter);
  return app;
}

function authenticatedFetch(
  app: Hono,
  path: string,
  init?: RequestInit
): Promise<Response> {
  mockGetSession.mockResolvedValueOnce({
    user: mockUser,
    session: { id: 'session-1' },
  });
  return Promise.resolve(
    app.fetch(new Request(`http://localhost${path}`, init))
  );
}

const baseAgent = {
  id: 'agent-uuid-1',
  userId: mockUser.id,
  name: 'Claude Code',
  type: 'mcp' as const,
  endpoint: null,
  allowedCollections: ['notes'],
  allowedRooms: [],
  permissions: 'read' as const,
  isActive: true,
  tokenHash: 'secret-hash',
  tokenExpiresAt: null,
  lastAccessAt: null,
  createdAt: new Date('2026-04-03'),
  updatedAt: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('agentsRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Auth protection
  // -------------------------------------------------------------------------

  describe('auth protection', () => {
    it('returns 401 for unauthenticated GET /', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const res = await app.fetch(new Request('http://localhost/api/agents'));
      expect(res.status).toBe(401);
    });

    it('returns 401 for unauthenticated POST /', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const res = await app.fetch(
        new Request('http://localhost/api/agents', { method: 'POST' })
      );
      expect(res.status).toBe(401);
    });
  });

  // -------------------------------------------------------------------------
  // GET / — list agents
  // -------------------------------------------------------------------------

  describe('GET /', () => {
    it('returns list of agents without tokenHash', async () => {
      mockGetAgentConfigsByUserId.mockResolvedValueOnce([baseAgent]);

      const res = await authenticatedFetch(app, '/api/agents');
      expect(res.status).toBe(200);

      const body = (await res.json()) as { agents: (typeof baseAgent)[] };
      expect(body.agents).toHaveLength(1);
      expect(body.agents[0]).not.toHaveProperty('tokenHash');
      expect(body.agents[0]?.name).toBe('Claude Code');
    });

    it('returns empty list when user has no agents', async () => {
      mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
      const res = await authenticatedFetch(app, '/api/agents');
      const body = (await res.json()) as { agents: unknown[] };
      expect(body.agents).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // POST / — create agent
  // -------------------------------------------------------------------------

  describe('POST /', () => {
    it('creates an agent and returns the plaintext token (once)', async () => {
      mockCreateAgentConfig.mockResolvedValueOnce({
        agentConfig: baseAgent,
        token: 'raw-token-value',
      });

      const res = await authenticatedFetch(app, '/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Claude Code',
          allowedCollections: ['notes'],
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        agent: unknown;
        token: string;
        warning: string;
      };
      expect(body.token).toBe('raw-token-value');
      expect(body.warning).toContain('Store this token securely');
      expect(body.agent).not.toHaveProperty('tokenHash');
    });

    it('returns 400 when name is missing', async () => {
      const res = await authenticatedFetch(app, '/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedCollections: ['notes'] }),
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when allowedCollections is missing', async () => {
      const res = await authenticatedFetch(app, '/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'My Agent' }),
      });
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — get single agent
  // -------------------------------------------------------------------------

  describe('GET /:id', () => {
    it('returns agent without tokenHash', async () => {
      mockGetAgentConfigById.mockResolvedValueOnce(baseAgent);
      const res = await authenticatedFetch(app, `/api/agents/${baseAgent.id}`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { agent: object };
      expect(body.agent).not.toHaveProperty('tokenHash');
    });

    it('returns 404 for nonexistent agent', async () => {
      mockGetAgentConfigById.mockResolvedValueOnce(null);
      const res = await authenticatedFetch(app, '/api/agents/nonexistent-id');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /:id/revoke
  // -------------------------------------------------------------------------

  describe('POST /:id/revoke', () => {
    it('revokes agent and returns updated config', async () => {
      const revokedAgent = { ...baseAgent, isActive: false, tokenHash: null };
      mockRevokeAgentConfig.mockResolvedValueOnce(revokedAgent);

      const res = await authenticatedFetch(
        app,
        `/api/agents/${baseAgent.id}/revoke`,
        { method: 'POST' }
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as {
        agent: { isActive: boolean };
        message: string;
      };
      expect(body.message).toContain('revoked');
      expect(body.agent.isActive).toBe(false);
    });

    it('returns 404 for nonexistent agent', async () => {
      mockRevokeAgentConfig.mockResolvedValueOnce(null);
      const res = await authenticatedFetch(
        app,
        '/api/agents/nonexistent/revoke',
        { method: 'POST' }
      );
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /:id/rotate-token
  // -------------------------------------------------------------------------

  describe('POST /:id/rotate-token', () => {
    it('rotates token and returns new token once', async () => {
      mockRotateAgentToken.mockResolvedValueOnce({
        agentConfig: baseAgent,
        token: 'new-raw-token',
      });

      const res = await authenticatedFetch(
        app,
        `/api/agents/${baseAgent.id}/rotate-token`,
        { method: 'POST' }
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { token: string; warning: string };
      expect(body.token).toBe('new-raw-token');
      expect(body.warning).toContain('Store this token securely');
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id
  // -------------------------------------------------------------------------

  describe('DELETE /:id', () => {
    it('deletes agent and returns confirmation', async () => {
      mockDeleteAgentConfig.mockResolvedValueOnce(true);

      const res = await authenticatedFetch(app, `/api/agents/${baseAgent.id}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { message: string };
      expect(body.message).toContain('deleted');
    });

    it('returns 404 for nonexistent agent', async () => {
      mockDeleteAgentConfig.mockResolvedValueOnce(false);
      const res = await authenticatedFetch(app, '/api/agents/gone', {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/logs
  // -------------------------------------------------------------------------

  describe('GET /:id/logs', () => {
    it('returns access logs for an agent', async () => {
      mockGetAgentConfigById.mockResolvedValueOnce(baseAgent);
      mockGetAgentAccessLogs.mockResolvedValueOnce([
        {
          id: 'log-1',
          agentId: baseAgent.id,
          userId: mockUser.id,
          roomId: 'room-123',
          collectionKey: 'notes',
          action: 'read',
          documentCount: 5,
          accessedAt: new Date(),
        },
      ]);

      const res = await authenticatedFetch(
        app,
        `/api/agents/${baseAgent.id}/logs`
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { logs: unknown[] };
      expect(body.logs).toHaveLength(1);
    });

    it('returns 404 when agent does not exist', async () => {
      mockGetAgentConfigById.mockResolvedValueOnce(null);
      const res = await authenticatedFetch(app, '/api/agents/nonexistent/logs');
      expect(res.status).toBe(404);
    });
  });

  // -------------------------------------------------------------------------
  // POST /verify-token — MCP server token validation (no session required)
  // -------------------------------------------------------------------------

  describe('POST /verify-token', () => {
    it('returns agent config for a valid active token', async () => {
      mockHashToken.mockReturnValueOnce('hashed:my-token');
      mockGetAgentConfigByTokenHash.mockResolvedValueOnce(baseAgent);
      mockTouchAgentLastAccess.mockResolvedValueOnce(undefined);

      // No session mocked — this endpoint skips session auth
      const res = await app.fetch(
        new Request('http://localhost/api/agents/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'my-token' }),
        })
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { agent: object };
      expect(body.agent).not.toHaveProperty('tokenHash');
    });

    it('returns 401 for an unknown token', async () => {
      mockHashToken.mockReturnValueOnce('hashed:bad-token');
      mockGetAgentConfigByTokenHash.mockResolvedValueOnce(null);

      const res = await app.fetch(
        new Request('http://localhost/api/agents/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'bad-token' }),
        })
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 for an expired token', async () => {
      mockHashToken.mockReturnValueOnce('hashed:expired-token');
      mockGetAgentConfigByTokenHash.mockResolvedValueOnce({
        ...baseAgent,
        tokenExpiresAt: new Date('2020-01-01'), // in the past
      });

      const res = await app.fetch(
        new Request('http://localhost/api/agents/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'expired-token' }),
        })
      );

      expect(res.status).toBe(401);
    });

    it('returns 401 for a revoked agent', async () => {
      mockHashToken.mockReturnValueOnce('hashed:revoked-token');
      // getAgentConfigByTokenHash is filtered by isActive=true, so it returns null
      mockGetAgentConfigByTokenHash.mockResolvedValueOnce(null);

      const res = await app.fetch(
        new Request('http://localhost/api/agents/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: 'revoked-token' }),
        })
      );

      expect(res.status).toBe(401);
    });

    it('returns 400 when token is missing', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/agents/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid JSON body', async () => {
      const res = await app.fetch(
        new Request('http://localhost/api/agents/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{not-valid-json',
        })
      );

      expect(res.status).toBe(400);
    });
  });
});

// ---------------------------------------------------------------------------
// Helper for agent-authenticated requests
// ---------------------------------------------------------------------------

function agentFetch(
  app: ReturnType<typeof makeApp>,
  path: string,
  body: unknown
): Promise<Response> {
  return Promise.resolve(
    app.fetch(
      new Request(`http://localhost${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer agent-raw-token',
        },
        body: JSON.stringify(body),
      })
    )
  );
}

const safeAgent = {
  id: 'agent-uuid-1',
  userId: 'user-uuid-1',
  name: 'Test MCP Agent',
  type: 'mcp' as const,
  endpoint: null,
  allowedCollections: ['notes'],
  allowedRooms: [],
  permissions: 'readwrite' as const,
  isActive: true,
  tokenExpiresAt: null,
  lastAccessAt: null,
  createdAt: new Date('2026-04-04'),
  updatedAt: null,
};

const mockRoom = {
  id: 'room-uuid-1',
  name: 'My Notes',
  collectionKey: 'notes',
  syncUrl: null,
  syncBaseUrl: null,
  userId: 'user-uuid-1',
  publicAccess: 'private' as const,
  readAccess: [],
  writeAccess: [],
  adminAccess: [],
  createdAt: new Date(),
  updatedAt: null,
  _deleted: false,
  _ttl: null,
};

const mockUserWithRooms = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  image: null,
  rooms: ['room-uuid-1'],
};

describe('agent-authenticated endpoints', () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
    // Default: valid agent token
    mockGetAgentConfigByTokenHash.mockResolvedValue({
      ...safeAgent,
      tokenHash: 'hashed:agent-raw-token',
    });
  });

  describe('POST /me/rooms', () => {
    it('returns rooms for the agent', async () => {
      mockGetUserById.mockResolvedValueOnce(mockUserWithRooms);
      mockGetRoomsByIds.mockResolvedValueOnce([mockRoom]);

      const res = await agentFetch(app, '/api/agents/me/rooms', {});
      expect(res.status).toBe(200);
      const data = await res.json<{ rooms: (typeof mockRoom)[] }>();
      expect(data.rooms).toHaveLength(1);
      expect(data.rooms[0]?.id).toBe('room-uuid-1');
    });

    it('filters rooms by allowedCollections', async () => {
      mockGetAgentConfigByTokenHash.mockResolvedValue({
        ...safeAgent,
        allowedCollections: ['flashcards'],
        tokenHash: 'hashed:agent-raw-token',
      });
      mockGetUserById.mockResolvedValueOnce(mockUserWithRooms);
      mockGetRoomsByIds.mockResolvedValueOnce([mockRoom]); // notes room

      const res = await agentFetch(app, '/api/agents/me/rooms', {});
      expect(res.status).toBe(200);
      const data = await res.json<{ rooms: unknown[] }>();
      expect(data.rooms).toHaveLength(0); // filtered out
    });

    it('returns 401 without agent token', async () => {
      mockGetAgentConfigByTokenHash.mockResolvedValue(null);
      const res = await agentFetch(app, '/api/agents/me/rooms', {});
      expect(res.status).toBe(401);
    });
  });

  describe('POST /me/sync-token', () => {
    it('returns sync token for allowed room', async () => {
      mockGetUserById.mockResolvedValueOnce(mockUserWithRooms);
      mockGetRoomsByIds.mockResolvedValueOnce([mockRoom]);

      const res = await agentFetch(app, '/api/agents/me/sync-token', {
        roomId: 'room-uuid-1',
      });
      expect(res.status).toBe(200);
      const data = await res.json<{
        syncUrl: string;
        syncToken: string;
        tokenExpiry: string;
      }>();
      expect(data.syncToken).toBe('sync-jwt-token');
      expect(data.syncUrl).toContain('room-uuid-1');
    });

    it('returns 404 if room not in user rooms', async () => {
      mockGetUserById.mockResolvedValueOnce({
        ...mockUserWithRooms,
        rooms: [],
      });

      const res = await agentFetch(app, '/api/agents/me/sync-token', {
        roomId: 'room-uuid-1',
      });
      expect(res.status).toBe(404);
    });

    it('returns 403 if collection not allowed', async () => {
      mockGetAgentConfigByTokenHash.mockResolvedValue({
        ...safeAgent,
        allowedCollections: ['flashcards'],
        tokenHash: 'hashed:agent-raw-token',
      });
      mockGetUserById.mockResolvedValueOnce(mockUserWithRooms);
      mockGetRoomsByIds.mockResolvedValueOnce([mockRoom]);

      const res = await agentFetch(app, '/api/agents/me/sync-token', {
        roomId: 'room-uuid-1',
      });
      expect(res.status).toBe(403);
    });

    it('returns 400 when roomId is missing', async () => {
      const res = await agentFetch(app, '/api/agents/me/sync-token', {});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /me/log', () => {
    it('logs access and returns ok', async () => {
      mockLogAgentAccess.mockResolvedValueOnce(undefined);

      const res = await agentFetch(app, '/api/agents/me/log', {
        roomId: 'room-uuid-1',
        collectionKey: 'notes',
        action: 'read',
        documentCount: 5,
      });
      expect(res.status).toBe(200);
      const data = await res.json<{ ok: boolean }>();
      expect(data.ok).toBe(true);
      expect(mockLogAgentAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'read',
          documentCount: 5,
        })
      );
    });

    it('returns 400 when action is invalid', async () => {
      const res = await agentFetch(app, '/api/agents/me/log', {
        roomId: 'room-uuid-1',
        collectionKey: 'notes',
        action: 'delete',
      });
      expect(res.status).toBe(400);
    });

    it('returns 400 when required fields are missing', async () => {
      const res = await agentFetch(app, '/api/agents/me/log', {
        roomId: 'room-uuid-1',
      });
      expect(res.status).toBe(400);
    });
  });
});
