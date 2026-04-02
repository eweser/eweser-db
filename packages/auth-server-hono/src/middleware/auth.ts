import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { auth } from '../auth.js';

type AuthVariables = {
  user: typeof auth.$Infer.Session.user;
  session: typeof auth.$Infer.Session.session;
};

/**
 * Middleware that validates the better-auth session from the incoming request.
 * Sets `c.var.user` and `c.var.session` on success.
 * Returns 401 if no valid session is found.
 */
export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(
  async (c: Context, next: Next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });

    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    c.set('user', session.user);
    c.set('session', session.session);
    await next();
  }
);
