import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

// ---------------------------------------------------------------------------
// Mock shared modules
// ---------------------------------------------------------------------------

vi.mock('../env.js', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    SERVER_SECRET: 'test-secret',
    PORT: 3000,
    BETTER_AUTH_SECRET: 'test-auth-secret',
    BETTER_AUTH_BASE_URL: 'http://localhost:3000',
    AUTH_SERVER_DOMAIN: 'auth.local',
    AUTH_SERVER_URL: 'http://localhost:3000',
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

// OAuth model mocks
const mockGetOAuthClient = vi.fn();
const mockCreateAuthCode = vi.fn();
const mockConsumeAuthCode = vi.fn();
const mockCreateOAuthAccessToken = vi.fn();
const mockGetValidOAuthAccessToken = vi.fn();
const mockRevokeOAuthAccessToken = vi.fn();
const mockVerifyPKCE = vi.fn();

vi.mock('../model/oauth.js', () => ({
  getOAuthClient: mockGetOAuthClient,
  createAuthCode: mockCreateAuthCode,
  consumeAuthCode: mockConsumeAuthCode,
  createOAuthAccessToken: mockCreateOAuthAccessToken,
  getValidOAuthAccessToken: mockGetValidOAuthAccessToken,
  revokeOAuthAccessToken: mockRevokeOAuthAccessToken,
  verifyPKCE: mockVerifyPKCE,
}));

const { oauthRouter, oauthServerMetadata } = await import('./oauth.js');

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

const firstPartyClient = {
  id: 'client-uuid-1',
  clientId: 'chatgpt-web',
  clientName: 'ChatGPT',
  redirectUris: ['https://chatgpt.com/aip/mcp/oauth/callback'],
  isFirstParty: true,
  createdAt: new Date('2026-01-01'),
};

const thirdPartyClient = {
  id: 'client-uuid-2',
  clientId: 'third-party-app',
  clientName: 'Third Party',
  redirectUris: ['https://third-party.example.com/callback'],
  isFirstParty: false,
  createdAt: new Date('2026-01-01'),
};

function makeApp() {
  const app = new Hono();
  app.route('/oauth', oauthRouter);
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('oauthRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = makeApp();
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // GET /oauth/authorize
  // -------------------------------------------------------------------------

  describe('GET /oauth/authorize', () => {
    it('returns 401 when not authenticated', async () => {
      mockGetSession.mockResolvedValueOnce(null);
      const res = await app.fetch(
        new Request(
          'http://localhost/oauth/authorize?client_id=chatgpt-web&redirect_uri=https://chatgpt.com/aip/mcp/oauth/callback&code_challenge=abc123&code_challenge_method=S256'
        )
      );
      expect(res.status).toBe(401);
    });

    it('returns 400 when required params are missing', async () => {
      const res = await authenticatedFetch(app, '/oauth/authorize?client_id=chatgpt-web');
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
    });

    it('returns 400 for unsupported code_challenge_method', async () => {
      const res = await authenticatedFetch(
        app,
        '/oauth/authorize?client_id=chatgpt-web&redirect_uri=https://chatgpt.com/aip/mcp/oauth/callback&code_challenge=abc&code_challenge_method=plain'
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
    });

    it('returns 400 for unknown client_id', async () => {
      mockGetOAuthClient.mockResolvedValueOnce(undefined);
      const res = await authenticatedFetch(
        app,
        '/oauth/authorize?client_id=unknown&redirect_uri=https://example.com/cb&code_challenge=abc&code_challenge_method=S256'
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_client');
    });

    it('returns 400 when redirect_uri not registered', async () => {
      mockGetOAuthClient.mockResolvedValueOnce(firstPartyClient);
      const res = await authenticatedFetch(
        app,
        '/oauth/authorize?client_id=chatgpt-web&redirect_uri=https://evil.example.com/callback&code_challenge=abc&code_challenge_method=S256'
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
    });

    it('returns 400 for invalid scope', async () => {
      mockGetOAuthClient.mockResolvedValueOnce(firstPartyClient);
      const res = await authenticatedFetch(
        app,
        '/oauth/authorize?client_id=chatgpt-web&redirect_uri=https://chatgpt.com/aip/mcp/oauth/callback&code_challenge=abc&code_challenge_method=S256&scope=admin'
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_scope');
    });

    it('redirects with code for first-party client (auto-approve)', async () => {
      mockGetOAuthClient.mockResolvedValueOnce(firstPartyClient);
      mockCreateAuthCode.mockResolvedValueOnce({ code: 'plaintext-code-123' });

      const res = await authenticatedFetch(
        app,
        '/oauth/authorize?client_id=chatgpt-web&redirect_uri=https://chatgpt.com/aip/mcp/oauth/callback&code_challenge=abc123&code_challenge_method=S256&state=xyz'
      );

      expect(res.status).toBe(302);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('code=plaintext-code-123');
      expect(location).toContain('state=xyz');
      expect(mockCreateAuthCode).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          clientId: 'chatgpt-web',
          codeChallenge: 'abc123',
        })
      );
    });

    it('redirects to consent page for third-party client', async () => {
      mockGetOAuthClient.mockResolvedValueOnce(thirdPartyClient);

      const res = await authenticatedFetch(
        app,
        '/oauth/authorize?client_id=third-party-app&redirect_uri=https://third-party.example.com/callback&code_challenge=abc&code_challenge_method=S256'
      );

      expect(res.status).toBe(302);
      const location = res.headers.get('location') ?? '';
      expect(location).toContain('/auth/oauth-consent');
    });
  });

  // -------------------------------------------------------------------------
  // POST /oauth/token
  // -------------------------------------------------------------------------

  describe('POST /oauth/token', () => {
    const validCodeRow = {
      id: 'code-uuid-1',
      codeHash: 'hashed-code',
      userId: mockUser.id,
      clientId: 'chatgpt-web',
      codeChallenge: 'expected-challenge',
      codeChallengeMethod: 'S256',
      redirectUri: 'https://chatgpt.com/aip/mcp/oauth/callback',
      scopes: 'read',
      expiresAt: new Date(Date.now() + 60000),
      usedAt: null,
      createdAt: new Date(),
    };

    it('returns 400 for unsupported grant_type', async () => {
      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ grant_type: 'client_credentials' }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('unsupported_grant_type');
    });

    it('returns 400 when required params are missing', async () => {
      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ grant_type: 'authorization_code', code: 'abc' }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_request');
    });

    it('returns 400 when code is invalid/expired', async () => {
      mockConsumeAuthCode.mockResolvedValueOnce(null);
      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'bad-code',
            redirect_uri: 'https://chatgpt.com/aip/mcp/oauth/callback',
            code_verifier: 'verifier',
            client_id: 'chatgpt-web',
          }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_grant');
    });

    it('returns 400 when client_id mismatch', async () => {
      mockConsumeAuthCode.mockResolvedValueOnce(validCodeRow);
      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'valid-code',
            redirect_uri: 'https://chatgpt.com/aip/mcp/oauth/callback',
            code_verifier: 'verifier',
            client_id: 'wrong-client',
          }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_grant');
    });

    it('returns 400 when PKCE fails', async () => {
      mockConsumeAuthCode.mockResolvedValueOnce(validCodeRow);
      mockVerifyPKCE.mockReturnValueOnce(false);
      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'valid-code',
            redirect_uri: 'https://chatgpt.com/aip/mcp/oauth/callback',
            code_verifier: 'bad-verifier',
            client_id: 'chatgpt-web',
          }),
        })
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('invalid_grant');
    });

    it('returns access token on success (JSON body)', async () => {
      mockConsumeAuthCode.mockResolvedValueOnce(validCodeRow);
      mockVerifyPKCE.mockReturnValueOnce(true);
      mockCreateOAuthAccessToken.mockResolvedValueOnce({
        accessToken: 'tok-abc123',
        expiresIn: 3600,
      });

      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'authorization_code',
            code: 'valid-code',
            redirect_uri: 'https://chatgpt.com/aip/mcp/oauth/callback',
            code_verifier: 'correct-verifier',
            client_id: 'chatgpt-web',
          }),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.access_token).toBe('tok-abc123');
      expect(body.token_type).toBe('bearer');
      expect(body.expires_in).toBe(3600);
      expect(body.scope).toBe('read');
    });

    it('returns access token on success (form-encoded body)', async () => {
      mockConsumeAuthCode.mockResolvedValueOnce(validCodeRow);
      mockVerifyPKCE.mockReturnValueOnce(true);
      mockCreateOAuthAccessToken.mockResolvedValueOnce({
        accessToken: 'tok-form123',
        expiresIn: 3600,
      });

      const res = await app.fetch(
        new Request('http://localhost/oauth/token', {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: 'valid-code',
            redirect_uri: 'https://chatgpt.com/aip/mcp/oauth/callback',
            code_verifier: 'correct-verifier',
            client_id: 'chatgpt-web',
          }).toString(),
        })
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.access_token).toBe('tok-form123');
    });
  });

  // -------------------------------------------------------------------------
  // POST /oauth/revoke
  // -------------------------------------------------------------------------

  describe('POST /oauth/revoke', () => {
    it('revokes token and returns 200', async () => {
      mockRevokeOAuthAccessToken.mockResolvedValueOnce(undefined);
      const res = await app.fetch(
        new Request('http://localhost/oauth/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: 'some-token' }),
        })
      );
      expect(res.status).toBe(200);
      expect(mockRevokeOAuthAccessToken).toHaveBeenCalledWith('some-token');
    });

    it('returns 200 even for unknown token (RFC 7009 §2.2)', async () => {
      mockRevokeOAuthAccessToken.mockResolvedValueOnce(undefined);
      const res = await app.fetch(
        new Request('http://localhost/oauth/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: 'token-that-does-not-exist' }),
        })
      );
      expect(res.status).toBe(200);
    });

    it('returns 400 when no token provided', async () => {
      const res = await app.fetch(
        new Request('http://localhost/oauth/revoke', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({}),
        })
      );
      expect(res.status).toBe(400);
    });
  });

  // -------------------------------------------------------------------------
  // oauthServerMetadata()
  // -------------------------------------------------------------------------

  describe('oauthServerMetadata()', () => {
    it('returns required RFC 8414 fields', () => {
      const meta = oauthServerMetadata();
      expect(meta.issuer).toBeDefined();
      expect(meta.authorization_endpoint).toContain('/oauth/authorize');
      expect(meta.token_endpoint).toContain('/oauth/token');
      expect(meta.code_challenge_methods_supported).toContain('S256');
      expect(meta.response_types_supported).toContain('code');
    });
  });
});
