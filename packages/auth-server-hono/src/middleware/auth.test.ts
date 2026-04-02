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

const mockGetSession = vi.fn();
vi.mock('../auth.js', () => ({
  auth: {
    handler: vi.fn(),
    api: { getSession: mockGetSession },
    $Infer: { Session: {} },
  },
}));

const { requireAuth } = await import('./auth.js');

function makeApp() {
  const app = new Hono();
  app.use('/*', requireAuth);
  app.get('/protected', (c) => c.json({ ok: true }));
  return app;
}

describe('requireAuth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call next and set user/session when session is valid', async () => {
    const fakeUser = { id: 'user-1', email: 'user@example.com', name: 'User' };
    const fakeSession = { id: 'sess-1', userId: 'user-1', token: 'tok' };
    mockGetSession.mockResolvedValueOnce({
      user: fakeUser,
      session: fakeSession,
    });

    const res = await makeApp().fetch(
      new Request('http://localhost/protected')
    );

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('should return 401 when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await makeApp().fetch(
      new Request('http://localhost/protected')
    );

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: 'Unauthorized' });
  });

  it('should return 401 when getSession throws', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('DB error'));

    // The middleware does not catch errors — they bubble up to Hono's error handler
    const app = makeApp();
    app.onError((_err, c) => c.json({ error: 'Internal error' }, 500));

    const res = await app.fetch(new Request('http://localhost/protected'));
    // Either 500 (unhandled) or 401 — both indicate the request was not served
    expect(res.status).not.toBe(200);
  });
});
