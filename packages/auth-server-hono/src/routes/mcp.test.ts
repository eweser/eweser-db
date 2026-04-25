import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

vi.mock('../env.js', () => ({
  env: {
    AUTH_SERVER_URL: 'http://localhost:3000',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
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

const { mcpRouter } = await import('./mcp.js');

function makeApp() {
  const app = new Hono();
  app.route('/mcp', mcpRouter);
  return app;
}

describe('mcpRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
