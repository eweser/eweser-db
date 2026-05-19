import { Hono } from 'hono';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
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
    vi.clearAllMocks();
  });

  it('returns a signed token for valid params', async () => {
    const response = await app.fetch(
      new Request('http://localhost/api/dev-token?room=room-1&collection=notes')
    );

    expect(response.status).toBe(200);
    expect(jwt.sign).toHaveBeenCalledWith(
      { roomId: 'room-1', collectionKey: 'notes', publicAccess: 'private' },
      'test-secret',
      { expiresIn: '24h' }
    );
    await expect(response.json()).resolves.toEqual({
      token: 'signed.token.value',
    });
  });

  it('accepts explicit public publication state', async () => {
    const response = await app.fetch(
      new Request(
        'http://localhost/api/dev-token?room=room-1&collection=notes&publicAccess=read'
      )
    );

    expect(response.status).toBe(200);
    expect(jwt.sign).toHaveBeenCalledWith(
      { roomId: 'room-1', collectionKey: 'notes', publicAccess: 'read' },
      'test-secret',
      { expiresIn: '24h' }
    );
  });

  it('returns 400 for invalid publication state', async () => {
    const response = await app.fetch(
      new Request(
        'http://localhost/api/dev-token?room=room-1&collection=notes&publicAccess=everyone'
      )
    );

    expect(response.status).toBe(400);
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
