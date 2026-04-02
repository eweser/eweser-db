import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import type { AccessGrantJWT } from '../services/rooms/sync-rooms-with-client.js';

export type JwtVariables = {
  access_grant_id: string;
  roomIds: string[];
};

/**
 * Middleware to require a valid JWT for room access.
 * This is used for SDK requests that use the access grant token.
 */
export const requireJwtAuth = createMiddleware<{ Variables: JwtVariables }>(
  async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return c.json({ error: 'No token provided' }, 401);
    }

    try {
      const decoded = jwt.verify(token, env.SERVER_SECRET) as AccessGrantJWT;
      c.set('access_grant_id', decoded.access_grant_id);
      c.set('roomIds', decoded.roomIds);
      await next();
    } catch {
      return c.json({ error: 'Invalid token' }, 401);
    }
  }
);
