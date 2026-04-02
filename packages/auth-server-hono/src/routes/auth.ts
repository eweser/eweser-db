import { Hono } from 'hono';
import { auth } from '../auth.js';

/**
 * Mounts all better-auth endpoints under `/api/auth`.
 *
 * better-auth handles:
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/session
 *   GET  /api/auth/callback/:provider   (OAuth)
 *   ...and more
 */
export const authRouter = new Hono();

authRouter.on(['GET', 'POST'], '/**', (c) => {
  return auth.handler(c.req.raw);
});
