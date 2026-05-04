import { describe, expect, it, vi } from 'vitest';

const serveMock = vi.fn();

vi.mock('@hono/node-server', () => ({
  serve: serveMock,
}));

vi.mock('./env.js', () => ({
  env: {
    AUTH_TRUSTED_ORIGINS: ['http://localhost:38101'],
    PORT: 38101,
    TRUST_PROXY: false,
  },
}));

vi.mock('./routes/account.js', async () => {
  const { Hono } = await import('hono');
  const accountRouter = new Hono();
  accountRouter.get('/bootstrap', (c) => c.json({ ok: true }));
  return { accountRouter };
});

vi.mock('./routes/auth.js', async () => {
  const { Hono } = await import('hono');
  const authRouter = new Hono();
  authRouter.get('/session', (c) => c.json({ ok: true }));
  return { authRouter };
});

vi.mock('./routes/access-grant.js', async () => {
  const { Hono } = await import('hono');
  const accessGrantRouter = new Hono();
  accessGrantRouter.get('/health', (c) => c.json({ ok: true }));
  return { accessGrantRouter };
});

vi.mock('./routes/files.js', async () => {
  const { Hono } = await import('hono');
  const filesRouter = new Hono();
  filesRouter.get('/health', (c) => c.json({ ok: true }));
  return { filesRouter };
});

const { app } = await import('./index.js');

describe('app health routes', () => {
  it('returns status payload for /health', async () => {
    const response = await app.fetch(new Request('http://localhost/health'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });

  it('returns pong for /ping', async () => {
    const response = await app.fetch(new Request('http://localhost/ping'));

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('pong');
  });

  it('serves account routes under the /api prefix used by auth-pages', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/account/bootstrap')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('serves access grant routes under the /api prefix used by the SDK', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/access-grant/health')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('starts the node server with configured port', () => {
    expect(serveMock).toHaveBeenCalled();
    const firstCallArg = serveMock.mock.calls[0]?.[0] as { port: number };
    expect(firstCallArg.port).toBe(38101);
  });

  it('rejects write requests with untrusted origin', async () => {
    const response = await app.fetch(
      new Request('http://localhost/auth/sign-in/email', {
        headers: { Origin: 'https://evil.example.com' },
        method: 'POST',
      })
    );

    expect(response.status).toBe(403);
  });
});
