import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { AgentConfig as DbAgentConfig } from '../db/schema/agents.js';

vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_URL: 'http://localhost:3000',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
    MCP_INTERNAL_AUTH_URL: 'http://auth-api:3000',
    MCP_INTERNAL_SYNC_URL: 'ws://sync-server:8080',
    MCP_ALLOWED_ORIGINS: ['https://chatgpt.com'],
    MCP_SESSION_MODE: 'single',
    SYNC_SERVER_URL: 'ws://localhost:38181',
  },
}));

vi.mock('../model/oauth.js', () => ({
  getValidOAuthAccessToken: vi.fn().mockResolvedValue(null),
  touchOAuthAccessToken: vi.fn(),
}));

vi.mock('../model/agents.js', () => ({
  getAgentConfigByTokenHash: vi.fn().mockResolvedValue(null),
  hashToken: vi.fn((value: string) => value),
  logAgentAccess: vi.fn(),
}));

vi.mock('../model/users.js', () => ({
  getUserById: vi.fn(),
}));

vi.mock('../model/rooms/calls.js', () => ({
  getRoomsByIds: vi.fn(),
}));

vi.mock('../model/security-events.js', () => ({
  logSecurityEvent: vi.fn(),
}));

const {
  mcpRouter,
  filterRoomsForAgentConfig,
  getInternalMcpAuthUrl,
  getInternalMcpSyncUrl,
  mapDbAgentConfigForMcp,
} = await import('./mcp.js');

function makeApp() {
  const app = new Hono();
  app.route('/mcp', mcpRouter);
  return app;
}

describe('mcpRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves split read and write scopes when mapping DB agent configs', () => {
    const tokenExpiresAt = new Date('2026-05-01T00:00:00.000Z');
    const dbAgent: DbAgentConfig = {
      id: 'agent-1',
      userId: 'user-1',
      name: 'Codex',
      type: 'mcp',
      endpoint: null,
      allowedCollections: [],
      allowedRooms: [],
      readAllowedCollections: ['notes', 'conversations'],
      readAllowedRooms: ['room-readable'],
      writeAllowedCollections: ['conversations'],
      writeAllowedRooms: ['room-conversations'],
      writeAllowedFolderIds: ['folder-ai'],
      writeAllowedPathPrefixes: ['AI/'],
      permissions: 'read',
      isActive: true,
      tokenHash: 'token-hash',
      tokenExpiresAt,
      lastAccessAt: null,
      createdAt: new Date('2026-04-28T00:00:00.000Z'),
      updatedAt: null,
    };

    expect(mapDbAgentConfigForMcp(dbAgent)).toMatchObject({
      id: 'agent-1',
      userId: 'user-1',
      name: 'Codex',
      type: 'mcp',
      allowedCollections: [],
      allowedRooms: [],
      readAllowedCollections: ['notes', 'conversations'],
      readAllowedRooms: ['room-readable'],
      writeAllowedCollections: ['conversations'],
      writeAllowedRooms: ['room-conversations'],
      writeAllowedFolderIds: ['folder-ai'],
      writeAllowedPathPrefixes: ['AI/'],
      permissions: 'read',
      isActive: true,
      tokenExpiresAt: tokenExpiresAt.toISOString(),
    });
  });

  it('filters MCP session rooms with explicit read scope before legacy scope', () => {
    const agentConfig = {
      id: 'agent-1',
      userId: 'user-1',
      name: 'Codex',
      type: 'mcp' as const,
      allowedCollections: [],
      allowedRooms: [],
      readAllowedCollections: ['conversations'],
      readAllowedRooms: ['room-conversations'],
      writeAllowedCollections: ['conversations'],
      writeAllowedRooms: ['room-conversations'],
      permissions: 'read' as const,
      isActive: true,
      tokenExpiresAt: null,
    };

    const rooms = filterRoomsForAgentConfig(
      [
        {
          id: 'room-notes',
          name: 'Notes',
          collectionKey: 'notes',
          syncUrl: null,
          syncBaseUrl: null,
        },
        {
          id: 'room-conversations',
          name: 'Conversations',
          collectionKey: 'conversations',
          syncUrl: null,
          syncBaseUrl: null,
        },
      ],
      agentConfig
    );

    expect(rooms).toEqual([
      {
        id: 'room-conversations',
        name: 'Conversations',
        collectionKey: 'conversations',
        syncUrl: null,
        syncBaseUrl: null,
      },
    ]);
  });

  it('returns 401 for unauthenticated MCP request', async () => {
    const app = makeApp();
    const response = await app.fetch(
      new Request('http://localhost/mcp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'tools/list' }),
      })
    );

    expect(response.status).toBe(401);
  });

  it('sets CORS headers for allowed preflight origin', async () => {
    const app = makeApp();
    const response = await app.fetch(
      new Request('http://localhost/mcp', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://chatgpt.com',
          'Access-Control-Request-Method': 'POST',
        },
      })
    );

    expect(response.headers.get('access-control-allow-origin')).toBe(
      'https://chatgpt.com'
    );
  });

  it('prefers internal MCP runtime URLs when provided', () => {
    expect(getInternalMcpAuthUrl()).toBe('http://auth-api:3000');
    expect(getInternalMcpSyncUrl()).toBe('http://sync-server:8080');
  });
});
