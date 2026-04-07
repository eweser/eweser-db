import { createMiddleware } from 'hono/factory';
import type { AgentConfig } from '../model/agents.js';
import { getAgentConfigByTokenHash, hashToken } from '../model/agents.js';

type AgentAuthVariables = {
  agent: Omit<AgentConfig, 'tokenHash'>;
};

/**
 * Middleware that validates an agent Bearer token.
 * Reads `Authorization: Bearer <token>`, hashes it, looks up in agent_configs.
 * Sets `c.var.agent` on success (without tokenHash).
 * Returns 401 if missing, invalid, revoked, or expired.
 */
export const agentAuth = createMiddleware<{ Variables: AgentAuthVariables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const token = authHeader.slice(7);
    if (!token) {
      return c.json({ error: 'Missing token' }, 401);
    }

    const tokenHash = hashToken(token);
    const agent = await getAgentConfigByTokenHash(tokenHash);

    if (!agent) {
      return c.json({ error: 'Invalid or revoked token' }, 401);
    }

    if (!agent.isActive) {
      return c.json({ error: 'Agent is revoked' }, 401);
    }

    if (agent.tokenExpiresAt && agent.tokenExpiresAt < new Date()) {
      return c.json({ error: 'Token expired' }, 401);
    }

    const { tokenHash: _tokenHash, ...safeAgent } = agent;
    c.set('agent', safeAgent);
    await next();
  }
);
