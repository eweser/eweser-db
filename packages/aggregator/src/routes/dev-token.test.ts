import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDevTokenRouter } from './dev-token.js';

vi.mock('../env.js', () => ({
  env: { SYNC_AUTH_SECRET: 'test-secret' },
}));

vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('signed.token.value') },
}));

describe('createDevTokenRouter', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.route('/api', createDevTokenRouter());
  });

  it('returns a signed token for valid params', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/dev-token?room=room-1&collection=notes')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      token: 'signed.token.value',
    });
  });

  it('returns 400 when room param is missing', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/dev-token?collection=notes')
    );

    expect(response.status).toBe(400);
  });

  it('returns 400 when collection param is missing', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/dev-token?room=room-1')
    );

    expect(response.status).toBe(400);
  });
});
