import { Hono } from 'hono';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';

/**
 * Dev-only endpoint: sign a JWT for a given room/collection so the browser
 * example app can authenticate against a Hocuspocus sync server without
 * needing a full auth flow.
 *
 * ⚠️  Never mount this in production.
 */
export function createDevTokenRouter() {
  const router = new Hono();

  router.get('/dev-token', (c) => {
    const roomId = c.req.query('room')?.trim();
    const collectionKey = c.req.query('collection')?.trim();

    if (!roomId || !collectionKey) {
      return c.json(
        { error: 'Missing required query parameters: room, collection' },
        400
      );
    }

    const token = jwt.sign({ roomId, collectionKey }, env.SYNC_AUTH_SECRET, {
      expiresIn: '24h',
    });

    return c.json({ token });
  });

  return router;
}
