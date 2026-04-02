import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

// Mock env to avoid process.exit on missing vars
vi.mock('../env.js', () => ({
  env: {
    DATABASE_URL: 'postgres://test:test@localhost:5432/test',
    SERVER_SECRET: 'test-secret',
    PORT: 3000,
    BETTER_AUTH_SECRET: 'test-auth-secret',
    BETTER_AUTH_BASE_URL: 'http://localhost:3000',
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
});
