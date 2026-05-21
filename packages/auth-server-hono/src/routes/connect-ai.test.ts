import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

vi.mock('../env.js', () => ({
  env: {
    AGENT_TOKEN_DEFAULT_TTL_SECONDS: 2_592_000,
    AGENT_TOKEN_MAX_TTL_SECONDS: 7_776_000,
    AUTH_DOMAIN: 'auth.local',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
    AUTH_SERVER_DOMAIN: 'auth.local',
    AUTH_SERVER_URL: 'https://eweser.com',
    BETTER_AUTH_BASE_URL: 'http://localhost:3000',
    BETTER_AUTH_SECRET: 'test-auth-secret',
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    MCP_ALLOWED_ORIGINS: ['https://chatgpt.com'],
    NODE_ENV: 'test',
    PORT: 3000,
    SERVER_SECRET: 'test-secret-test-secret-test-secret',
    SYNC_SERVER_URL: 'ws://localhost:38181',
    TRUST_PROXY: false,
    AUTH_ENABLE_2FA: true,
  },
}));

const mockGetSession = vi.fn();

vi.mock('../auth.js', () => ({
  auth: {
    handler: vi.fn(),
    api: { getSession: mockGetSession },
    $Infer: { Session: {} },
  },
}));

const mockCreateAgentConfig = vi.fn();
const mockGetAgentConfigsByUserId = vi.fn();
const mockRevokeAgentConfig = vi.fn();
const mockRotateAgentToken = vi.fn();
const mockUpdateAgentConfigScope = vi.fn();
const mockGetWritableRoomsByUserId = vi.fn();

vi.mock('../model/agents.js', () => ({
  createAgentConfig: mockCreateAgentConfig,
  getAgentConfigsByUserId: mockGetAgentConfigsByUserId,
  revokeAgentConfig: mockRevokeAgentConfig,
  rotateAgentToken: mockRotateAgentToken,
  updateAgentConfigScope: mockUpdateAgentConfigScope,
}));

const mockGetOAuthAccessTokensByUserId = vi.fn();
const mockRevokeOAuthAccessTokensForUserClient = vi.fn();

vi.mock('../model/oauth.js', () => ({
  getOAuthAccessTokensByUserId: mockGetOAuthAccessTokensByUserId,
  revokeOAuthAccessTokensForUserClient:
    mockRevokeOAuthAccessTokensForUserClient,
}));

vi.mock('../model/rooms/calls.js', () => ({
  getWritableRoomsByUserId: mockGetWritableRoomsByUserId,
}));

const { connectAiRouter } = await import('./connect-ai.js');

const mockUser = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  image: null,
};

function makeApp() {
  const app = new Hono();
  app.route('/api/account/connect-ai', connectAiRouter);
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

describe('connectAiRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
    mockGetWritableRoomsByUserId.mockResolvedValue([
      {
        id: 'room-ai',
        name: 'AI Notes',
        collectionKey: 'notes',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);
  });

  it('returns the six supported clients with connection metadata', async () => {
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([
      {
        id: 'agent-uuid-1',
        userId: mockUser.id,
        name: 'Connect AI: Codex',
        type: 'mcp',
        endpoint: 'https://eweser.com/mcp',
        allowedCollections: ['notes'],
        allowedRooms: [],
        permissions: 'read',
        readAllowedCollections: ['notes'],
        readAllowedRooms: [],
        isActive: true,
        tokenHash: 'secret-hash',
        tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
        lastAccessAt: null,
        writeAllowedCollections: ['notes'],
        writeAllowedFolderIds: [],
        writeAllowedPathPrefixes: [],
        writeAllowedRooms: ['room-ai'],
        createdAt: new Date('2026-04-24T00:00:00.000Z'),
        updatedAt: null,
      },
    ]);
    mockGetOAuthAccessTokensByUserId.mockResolvedValueOnce([]);

    const res = await authenticatedFetch(app, '/api/account/connect-ai');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clients).toHaveLength(6);
    expect(body.mcpUrl).toBe('https://eweser.com/mcp');
    expect(body.smartLinkRule).toContain('Never place bearer tokens in URLs');
    expect(body.memoryStrategy.defaultStrategy).toBe('agent-journal');
    expect(body.memoryStrategy.defaultCaptureMode).toBe('manual');
    expect(body.memoryStrategy.captureModes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: 'manual', enabled: true }),
        expect.objectContaining({ mode: 'suggest', enabled: true }),
        expect.objectContaining({ mode: 'auto', enabled: false }),
      ])
    );
    expect(body.writableRooms).toEqual([
      expect.objectContaining({ id: 'room-ai', name: 'AI Notes' }),
    ]);
    expect(
      body.clients.find(
        (client: { clientId: string }) => client.clientId === 'codex'
      )?.connection
    ).toEqual(expect.objectContaining({ writeRoomCount: 1 }));
    expect(body.memoryStrategy.scopes[0]?.readableRoomIds).toEqual([]);
    expect(body.memoryStrategy.scopes[0]?.defaultWriteRoomId).toBeUndefined();
  });

  it('omits defaultWriteRoomId from the overview when multiple memory rooms are writable', async () => {
    mockGetWritableRoomsByUserId.mockResolvedValueOnce([
      {
        id: 'room-conversations-1',
        name: 'AI Memory',
        collectionKey: 'conversations',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-conversations-2',
        name: 'AI Memory 2',
        collectionKey: 'conversations',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
    mockGetOAuthAccessTokensByUserId.mockResolvedValueOnce([]);

    const res = await authenticatedFetch(app, '/api/account/connect-ai');

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.memoryStrategy.scopes[0]?.writableRoomIds).toEqual([
      'room-conversations-1',
      'room-conversations-2',
    ]);
    expect(body.memoryStrategy.scopes[0]?.readableRoomIds).toEqual([
      'room-conversations-1',
      'room-conversations-2',
    ]);
    expect(body.memoryStrategy.scopes[0]).not.toHaveProperty(
      'defaultWriteRoomId'
    );
  });

  it('creates a token setup payload for project-wiki when source, draft, and page rooms are selected', async () => {
    mockGetWritableRoomsByUserId.mockResolvedValueOnce([
      {
        id: 'room-strategy',
        name: 'Strategy Configs',
        collectionKey: 'memoryStrategyConfigs',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-source',
        name: 'Project Memory',
        collectionKey: 'conversations',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-drafts',
        name: 'Wiki Drafts',
        collectionKey: 'projectWikiDrafts',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-pages',
        name: 'Wiki Pages',
        collectionKey: 'projectWikiPages',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
    mockCreateAgentConfig.mockResolvedValueOnce({
      agentConfig: {
        id: 'agent-uuid-1',
        userId: mockUser.id,
        name: 'Connect AI: Codex',
        type: 'mcp',
        endpoint: 'https://eweser.com/mcp',
        allowedCollections: ['notes'],
        allowedRooms: [],
        permissions: 'read',
        readAllowedCollections: [
          'memoryStrategyConfigs',
          'conversations',
          'projectWikiDrafts',
          'projectWikiPages',
        ],
        readAllowedRooms: [
          'room-strategy',
          'room-source',
          'room-drafts',
          'room-pages',
        ],
        isActive: true,
        tokenHash: 'secret-hash',
        tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
        lastAccessAt: null,
        writeAllowedCollections: ['projectWikiDrafts', 'projectWikiPages'],
        writeAllowedFolderIds: [],
        writeAllowedPathPrefixes: [],
        writeAllowedRooms: ['room-drafts', 'room-pages'],
        createdAt: new Date('2026-04-24T00:00:00.000Z'),
        updatedAt: null,
      },
      token: 'agent-token-123',
    });

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          memoryStrategy: 'project-wiki',
          readableRoomIds: [
            'room-strategy',
            'room-source',
            'room-drafts',
            'room-pages',
          ],
          writableRoomIds: ['room-drafts', 'room-pages'],
        }),
      }
    );

    expect(res.status).toBe(200);
    expect(mockCreateAgentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        readAllowedRooms: [
          'room-strategy',
          'room-source',
          'room-drafts',
          'room-pages',
        ],
        writeAllowedCollections: ['projectWikiDrafts', 'projectWikiPages'],
        writeAllowedRooms: ['room-drafts', 'room-pages'],
      })
    );
  });

  it('rejects project-wiki setup without a readable source room', async () => {
    mockGetWritableRoomsByUserId.mockResolvedValueOnce([
      {
        id: 'room-drafts',
        name: 'Wiki Drafts',
        collectionKey: 'projectWikiDrafts',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-pages',
        name: 'Wiki Pages',
        collectionKey: 'projectWikiPages',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          memoryStrategy: 'project-wiki',
          readableRoomIds: [],
          writableRoomIds: ['room-drafts', 'room-pages'],
        }),
      }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Project Wiki requires readable source rooms',
    });
  });

  it('rejects project-wiki setup without dedicated draft and page rooms', async () => {
    mockGetWritableRoomsByUserId.mockResolvedValueOnce([
      {
        id: 'room-source',
        name: 'Project Memory',
        collectionKey: 'conversations',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-pages',
        name: 'Wiki Pages',
        collectionKey: 'projectWikiPages',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          memoryStrategy: 'project-wiki',
          readableRoomIds: ['room-source', 'room-pages'],
          writableRoomIds: ['room-pages'],
        }),
      }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Project Wiki requires a writable projectWikiDrafts room',
    });
  });

  it('creates a token setup payload for Claude Desktop', async () => {
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
    mockCreateAgentConfig.mockResolvedValueOnce({
      agentConfig: {
        id: 'agent-uuid-1',
        userId: mockUser.id,
        name: 'Connect AI: Claude Desktop',
        type: 'mcp',
        endpoint: 'https://eweser.com',
        allowedCollections: ['notes'],
        allowedRooms: [],
        permissions: 'read',
        readAllowedCollections: ['notes'],
        readAllowedRooms: [],
        isActive: true,
        tokenHash: 'secret-hash',
        tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
        lastAccessAt: null,
        writeAllowedCollections: [],
        writeAllowedFolderIds: [],
        writeAllowedPathPrefixes: [],
        writeAllowedRooms: [],
        createdAt: new Date('2026-04-24T00:00:00.000Z'),
        updatedAt: null,
      },
      token: 'agent-token-123',
    });

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'claude-desktop', writeRoomIds: [] }),
      }
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clientId).toBe('claude-desktop');
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('pragma')).toBe('no-cache');
    expect(body.payload.snippet).toContain('@eweser/mcp');
    expect(body.payload.snippet).toContain('EWESER_AGENT_TOKEN');
    expect(mockCreateAgentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        readAllowedCollections: expect.any(Array),
        writeAllowedCollections: [],
        writeAllowedRooms: [],
      })
    );
  });

  it('defaults token setup writes to dedicated conversation memory rooms', async () => {
    mockGetWritableRoomsByUserId.mockResolvedValueOnce([
      {
        id: 'room-conversations',
        name: 'Conversations',
        collectionKey: 'conversations',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-ai',
        name: 'AI Notes',
        collectionKey: 'notes',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-private',
        name: 'Private Notes',
        collectionKey: 'notes',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
    mockCreateAgentConfig.mockResolvedValueOnce({
      agentConfig: {
        id: 'agent-uuid-1',
        userId: mockUser.id,
        name: 'Connect AI: Codex',
        type: 'mcp',
        endpoint: 'https://eweser.com/mcp',
        allowedCollections: ['notes'],
        allowedRooms: [],
        permissions: 'read',
        readAllowedCollections: ['notes'],
        readAllowedRooms: [],
        isActive: true,
        tokenHash: 'secret-hash',
        tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
        lastAccessAt: null,
        writeAllowedCollections: ['conversations'],
        writeAllowedFolderIds: [],
        writeAllowedPathPrefixes: [],
        writeAllowedRooms: ['room-conversations'],
        createdAt: new Date('2026-04-24T00:00:00.000Z'),
        updatedAt: null,
      },
      token: 'agent-token-123',
    });

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'codex' }),
      }
    );

    expect(res.status).toBe(200);
    expect(mockCreateAgentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        writeAllowedCollections: ['conversations'],
        writeAllowedRooms: ['room-conversations'],
      })
    );
  });

  it('creates token setup payload with selected readable and writable rooms', async () => {
    mockGetWritableRoomsByUserId.mockResolvedValueOnce([
      {
        id: 'room-conversations',
        name: 'Conversations',
        collectionKey: 'conversations',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
      {
        id: 'room-ai',
        name: 'AI Notes',
        collectionKey: 'notes',
        syncUrl: 'wss://sync.eweser.com',
        syncBaseUrl: null,
      },
    ]);
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
    mockCreateAgentConfig.mockResolvedValueOnce({
      agentConfig: {
        id: 'agent-uuid-1',
        userId: mockUser.id,
        name: 'Connect AI: Codex',
        type: 'mcp',
        endpoint: 'https://eweser.com/mcp',
        allowedCollections: ['notes'],
        allowedRooms: [],
        permissions: 'read',
        readAllowedCollections: ['conversations', 'notes'],
        readAllowedRooms: ['room-conversations', 'room-ai'],
        isActive: true,
        tokenHash: 'secret-hash',
        tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
        lastAccessAt: null,
        writeAllowedCollections: ['conversations'],
        writeAllowedFolderIds: [],
        writeAllowedPathPrefixes: [],
        writeAllowedRooms: ['room-conversations'],
        createdAt: new Date('2026-04-24T00:00:00.000Z'),
        updatedAt: null,
      },
      token: 'agent-token-123',
    });

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          captureMode: 'suggest',
          defaultWriteRoomId: 'room-conversations',
          memoryStrategy: 'agent-journal',
          readableRoomIds: ['room-conversations', 'room-ai'],
          writableRoomIds: ['room-conversations'],
        }),
      }
    );

    expect(res.status).toBe(200);
    expect(mockCreateAgentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        readAllowedCollections: ['conversations', 'notes'],
        readAllowedRooms: ['room-conversations', 'room-ai'],
        writeAllowedCollections: ['conversations'],
        writeAllowedRooms: ['room-conversations'],
      })
    );
  });

  it('creates a token setup payload with a selected writable room', async () => {
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([]);
    mockCreateAgentConfig.mockResolvedValueOnce({
      agentConfig: {
        id: 'agent-uuid-1',
        userId: mockUser.id,
        name: 'Connect AI: Codex',
        type: 'mcp',
        endpoint: 'https://eweser.com/mcp',
        allowedCollections: ['notes'],
        allowedRooms: [],
        permissions: 'read',
        readAllowedCollections: ['notes'],
        readAllowedRooms: [],
        isActive: true,
        tokenHash: 'secret-hash',
        tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
        lastAccessAt: null,
        writeAllowedCollections: ['notes'],
        writeAllowedFolderIds: [],
        writeAllowedPathPrefixes: [],
        writeAllowedRooms: ['room-ai'],
        createdAt: new Date('2026-04-24T00:00:00.000Z'),
        updatedAt: null,
      },
      token: 'agent-token-123',
    });

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'codex', writeRoomIds: ['room-ai'] }),
      }
    );

    expect(res.status).toBe(200);
    expect(mockCreateAgentConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        writeAllowedCollections: ['notes'],
        writeAllowedRooms: ['room-ai'],
      })
    );
  });

  it('rejects token setup with an unauthorized writable room', async () => {
    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          writeRoomIds: ['room-other'],
        }),
      }
    );

    expect(res.status).toBe(403);
    expect(mockCreateAgentConfig).not.toHaveBeenCalled();
  });

  it('rejects token setup with an unauthorized readable room', async () => {
    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          readableRoomIds: ['room-other'],
          writableRoomIds: [],
        }),
      }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Invalid readable room' });
    expect(mockCreateAgentConfig).not.toHaveBeenCalled();
  });

  it('rejects token setup with disabled automatic capture', async () => {
    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          captureMode: 'auto',
        }),
      }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: 'Automatic capture is not enabled yet',
    });
  });

  it('rejects token setup when default write room is not writable', async () => {
    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/setup-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          clientId: 'codex',
          defaultWriteRoomId: 'room-ai',
          writableRoomIds: [],
        }),
      }
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'Invalid default write room' });
  });

  it('updates writable scope before rotating an existing token', async () => {
    const existingAgent = {
      id: 'agent-uuid-1',
      userId: mockUser.id,
      name: 'Connect AI: Codex',
      type: 'mcp',
      endpoint: 'https://eweser.com/mcp',
      allowedCollections: ['notes'],
      allowedRooms: [],
      permissions: 'read',
      readAllowedCollections: ['notes'],
      readAllowedRooms: [],
      isActive: true,
      tokenHash: 'secret-hash',
      tokenExpiresAt: new Date('2026-05-01T00:00:00.000Z'),
      lastAccessAt: null,
      writeAllowedCollections: [],
      writeAllowedFolderIds: [],
      writeAllowedPathPrefixes: [],
      writeAllowedRooms: [],
      createdAt: new Date('2026-04-24T00:00:00.000Z'),
      updatedAt: null,
    };
    mockGetAgentConfigsByUserId.mockResolvedValueOnce([existingAgent]);
    mockUpdateAgentConfigScope.mockResolvedValueOnce({
      ...existingAgent,
      writeAllowedCollections: ['notes'],
      writeAllowedRooms: ['room-ai'],
    });
    mockRotateAgentToken.mockResolvedValueOnce({
      agentConfig: {
        ...existingAgent,
        writeAllowedCollections: ['notes'],
        writeAllowedRooms: ['room-ai'],
      },
      token: 'rotated-token-123',
    });

    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/rotate-token',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'codex', writeRoomIds: ['room-ai'] }),
      }
    );

    expect(res.status).toBe(200);
    expect(mockUpdateAgentConfigScope).toHaveBeenCalledWith(
      'agent-uuid-1',
      mockUser.id,
      expect.objectContaining({
        writeAllowedCollections: ['notes'],
        writeAllowedRooms: ['room-ai'],
      })
    );
    expect(mockRotateAgentToken).toHaveBeenCalledWith(
      'agent-uuid-1',
      mockUser.id
    );
  });

  it('revokes OAuth-backed client access', async () => {
    const res = await authenticatedFetch(
      app,
      '/api/account/connect-ai/revoke',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ clientId: 'chatgpt-web' }),
      }
    );

    expect(res.status).toBe(200);
    expect(mockRevokeOAuthAccessTokensForUserClient).toHaveBeenCalledWith(
      mockUser.id,
      'chatgpt-web'
    );
  });
});
