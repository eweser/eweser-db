/**
 * Server capability/version endpoint for the auth server.
 *
 * GET /capabilities returns machine-readable metadata aligned with
 * ADR-0010: auth API surface, OAuth provider availability, server version,
 * and feature flags. No secrets, env values, or credential material is exposed.
 */
import { readFileSync } from 'node:fs';
import { Hono } from 'hono';
import { env } from '../env.js';

export const capabilitiesRouter = new Hono();

/** Read own package version at import time. */
let _version: string | null = null;
function getVersion(): string {
  if (_version) return _version;
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf-8')
    ) as { version: string };
    _version = pkg.version;
  } catch {
    _version = '0.0.0';
  }
  return _version;
}

capabilitiesRouter.get('/', (c) => {
  const oauthProviders: string[] = [];
  if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)
    oauthProviders.push('github');
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)
    oauthProviders.push('google');

  return c.json({
    server: 'eweser-db',
    component: 'auth-server',
    version: getVersion(),
    capabilities: {
      auth: {
        methods: ['email-password'],
        ...(oauthProviders.length > 0 ? { oauthProviders } : {}),
        mcpTokens: true,
        agentTokens: true,
        twoFactor: env.AUTH_ENABLE_2FA,
      },
      federation: {
        wellKnown: '/.well-known/eweser-server',
        signingAlgorithm: 'Ed25519',
      },
      storage: {
        provider: env.STORAGE_PROVIDER_PROFILE_ID,
      },
    },
  });
});
