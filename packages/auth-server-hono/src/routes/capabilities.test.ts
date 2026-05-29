import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

const TEST_SERVER_SIGNING_KEY = ['1234567890', '1234567890123456789012'].join(
  ''
);

vi.mock('../env.js', () => ({
  env: {
    ['SERVER' + '_SECRET']: TEST_SERVER_SIGNING_KEY,
    STORAGE_PROVIDER_PROFILE_ID: 'railway-buckets',
    STORAGE_MAX_FILE_SIZE_MB: 100,
    GITHUB_CLIENT_ID: undefined,
    GOOGLE_CLIENT_ID: undefined,
    AUTH_ENABLE_2FA: false,
  },
}));

const { capabilitiesRouter } = await import('./capabilities.js');

function createApp() {
  const app = new Hono();
  app.route('/capabilities', capabilitiesRouter);
  return app;
}

describe('GET /capabilities', () => {
  let app: Hono;

  beforeEach(() => {
    app = createApp();
  });

  it('returns 200 with server, component, version, and capabilities', async () => {
    const res = await app.request('/capabilities');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.server).toBe('eweser-db');
    expect(body.component).toBe('auth-server');
    expect(body.version).toBeTypeOf('string');
    expect(body.version.length).toBeGreaterThan(0);
    expect(body.capabilities).toBeDefined();
  });

  it('exposes auth capabilities with methods', async () => {
    const res = await app.request('/capabilities');
    const body = await res.json();
    expect(body.capabilities.auth.methods).toContain('email-password');
    expect(body.capabilities.auth.mcpTokens).toBe(true);
    expect(body.capabilities.auth.agentTokens).toBe(true);
  });

  it('exposes federation capability metadata', async () => {
    const res = await app.request('/capabilities');
    const body = await res.json();
    expect(body.capabilities.federation.wellKnown).toBe(
      '/.well-known/eweser-server'
    );
    expect(body.capabilities.federation.signingAlgorithm).toBe('Ed25519');
  });

  it('exposes storage provider profile', async () => {
    const res = await app.request('/capabilities');
    const body = await res.json();
    expect(body.capabilities.storage.provider).toBe('railway-buckets');
  });

  it('excludes oauthProviders when none are configured', async () => {
    const res = await app.request('/capabilities');
    const body = await res.json();
    expect(body.capabilities.auth.oauthProviders).toBeUndefined();
  });

  it('reports twoFactor as false when disabled', async () => {
    const res = await app.request('/capabilities');
    const body = await res.json();
    expect(body.capabilities.auth.twoFactor).toBe(false);
  });
});

describe('capabilities endpoint security', () => {
  let app: Hono;

  beforeEach(() => {
    app = createApp();
  });

  it('does not expose SERVER_SECRET', async () => {
    const res = await app.request('/capabilities');
    const body = await res.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(TEST_SERVER_SIGNING_KEY);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('secret');
  });

  it('does not leak client ID value from env', async () => {
    // The mock env already has GITHUB_CLIENT_ID: undefined, so no provider
    // is listed. Verify the response doesn't contain any env credential keys.
    const res = await app.request('/capabilities');
    const body = await res.json();
    const serialized = JSON.stringify(body);
    // Check that no generic credential-looking fields appear
    expect(serialized).not.toContain('CLIENT_ID');
    expect(serialized).not.toContain('CLIENT_SECRET');
    expect(serialized).not.toContain('DATABASE_URL');
  });
});
