import { createMiddleware } from 'hono/factory';
import { getValidOAuthAccessToken } from '../model/oauth.js';
import type { OAuthAccessToken } from '../model/oauth.js';

type OAuthVariables = {
  oauthToken: OAuthAccessToken;
};

/**
 * Middleware that validates an OAuth 2.0 Bearer token.
 * Reads `Authorization: Bearer <token>`, verifies against oauth_access_tokens.
 * Sets `c.var.oauthToken` on success.
 * Returns 401 if missing or invalid.
 */
export const oauthBearerAuth = createMiddleware<{
  Variables: OAuthVariables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  if (!token) {
    return c.json({ error: 'Missing token' }, 401);
  }

  const oauthToken = await getValidOAuthAccessToken(token);
  if (!oauthToken) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  c.set('oauthToken', oauthToken);
  await next();
});
