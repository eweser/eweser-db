/**
 * Combined auth middleware for endpoints that accept both:
 *   1. Agent bearer tokens (agent_configs.token_hash)
 *   2. OAuth 2.0 access tokens (oauth_access_tokens.token_hash)
 *
 * On success, sets `c.var.agent` — same type as agentAuth middleware.
 * For OAuth tokens, a synthetic AgentConfig is constructed using the
 * user's full room access and the scopes on the token.
 */
import { createMiddleware } from 'hono/factory';
import type { AgentConfig } from '../model/agents.js';
import { getAgentConfigByTokenHash, hashToken } from '../model/agents.js';
import { getValidOAuthAccessToken } from '../model/oauth.js';
import { getUserById } from '../model/users.js';

type AgentAuthVariables = {
  agent: Omit<AgentConfig, 'tokenHash'>;
};

export const combinedAgentAuth = createMiddleware<{
  Variables: AgentAuthVariables;
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  if (!token) {
    return c.json({ error: 'Missing token' }, 401);
  }

  // 1. Try agent token first
  const tokenHash = hashToken(token);
  const agent = await getAgentConfigByTokenHash(tokenHash);

  if (agent) {
    if (!agent.isActive) {
      return c.json({ error: 'Agent is revoked' }, 401);
    }
    if (agent.tokenExpiresAt && agent.tokenExpiresAt < new Date()) {
      return c.json({ error: 'Token expired' }, 401);
    }
    const { tokenHash: _th, ...safeAgent } = agent;
    c.set('agent', safeAgent);
    return next();
  }

  // 2. Try OAuth access token
  const oauthToken = await getValidOAuthAccessToken(token);
  if (oauthToken) {
    const user = await getUserById(oauthToken.userId);
    if (!user) {
      return c.json({ error: 'User not found' }, 401);
    }

    const syntheticAgent: Omit<AgentConfig, 'tokenHash'> = {
      id: `oauth-${oauthToken.id}`,
      userId: oauthToken.userId,
      name: `OAuth:${oauthToken.clientId}`,
      type: 'mcp',
      endpoint: null,
      allowedCollections: [],
      allowedRooms: user.rooms ?? [],
      permissions: oauthToken.scopes.includes('readwrite')
        ? 'readwrite'
        : 'read',
      isActive: true,
      tokenExpiresAt: oauthToken.expiresAt,
      lastAccessAt: null,
      createdAt: oauthToken.createdAt,
      updatedAt: null,
    };
    c.set('agent', syntheticAgent);
    return next();
  }

  return c.json({ error: 'Invalid or expired token' }, 401);
});
