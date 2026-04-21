import { createMiddleware } from 'hono/factory';

export const requireVerifiedEmail = createMiddleware(async (c, next) => {
  const user = c.get('user');
  if (!user?.emailVerified) {
    return c.json(
      {
        error: 'Email verification required for this action',
      },
      403
    );
  }
  await next();
});
