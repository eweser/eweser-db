import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock env to avoid process.exit on missing vars
vi.mock('../env.js', () => ({
  env: {
    AGENT_TOKEN_DEFAULT_TTL_SECONDS: 2_592_000,
    AGENT_TOKEN_MAX_TTL_SECONDS: 7_776_000,
    AUTH_DOMAIN: 'localhost:3000',
    AUTH_TRUSTED_ORIGINS: ['http://localhost:3000'],
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    SERVER_SECRET: 'test-secret',
    PORT: 3000,
    BETTER_AUTH_SECRET: 'test-auth-secret',
    BETTER_AUTH_BASE_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
    TRUST_PROXY: false,
    AUTH_ENABLE_2FA: true,
  },
}));

// Mock auth module to avoid real DB connections
const mockHandler = vi.fn();
vi.mock('../auth.js', () => ({
  auth: {
    handler: mockHandler,
    api: { getSession: vi.fn() },
  },
}));

const { authRouter } = await import('./auth.js');

describe('authRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api/auth', authRouter);
    vi.clearAllMocks();
  });

  it('should proxy POST /sign-up/email to better-auth handler', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'abc123' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        }),
      })
    );

    expect(mockHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('should proxy POST /sign-in/email to better-auth handler', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'session-token' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })
    );

    expect(mockHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('should proxy GET /session to better-auth handler', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ user: null, session: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/session')
    );

    expect(mockHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });

  it('should forward 401 from better-auth for invalid credentials', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid credentials' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrong-password',
        }),
      })
    );

    expect(mockHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(401);
  });

  it('should proxy OAuth callback GET requests to better-auth handler', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { Location: 'http://localhost:3000/dashboard' },
      })
    );

    const res = await app.fetch(
      new Request(
        'http://localhost/api/auth/callback/github?code=abc&state=xyz'
      )
    );

    expect(mockHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(302);
  });

  it('should normalize sign-in failure response body', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'user does not exist' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'missing@example.com',
          password: 'wrong-password',
        }),
      })
    );

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Invalid credentials or verification required.');
  });

  it('preserves Retry-After when normalizing rate-limited sign-in errors', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Too many requests' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '42',
        },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'rate-limited@example.com',
          password: 'wrong-password',
        }),
      })
    );

    expect(res.status).toBe(429);
    expect(res.headers.get('retry-after')).toBe('42');
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe('Invalid credentials or verification required.');
  });

  it('should normalize password-reset request failures to non-enumerating message', async () => {
    mockHandler.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'user not found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const res = await app.fetch(
      new Request('http://localhost/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'missing@example.com' }),
      })
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe(
      'If an account exists, password reset instructions were sent.'
    );
  });
});
