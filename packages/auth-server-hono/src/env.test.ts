import { describe, expect, it } from 'vitest';

const base = {
  AGENT_TOKEN_DEFAULT_TTL_SECONDS: '2592000',
  AGENT_TOKEN_MAX_TTL_SECONDS: '7776000',
  AUTH_API_PORT: '38101',
  AUTH_ENABLE_2FA: 'true',
  AUTH_SERVER_DOMAIN: 'localhost:38101',
  AUTH_SERVER_URL: 'http://localhost:38101',
  AUTH_TRUSTED_ORIGINS: 'http://localhost:38101',
  BETTER_AUTH_BASE_URL: 'http://localhost:38101',
  BETTER_AUTH_SECRET: 'replace-with-random-32+-char-secret',
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  MCP_ALLOWED_ORIGINS: 'http://localhost:38101',
  MCP_SESSION_MODE: 'single',
  PORT: '38101',
  SERVER_SECRET: 'replace-with-random-32+-char-server-secret',
  TRUST_PROXY: 'false',
};

Object.assign(process.env, base);

async function loadParseEnv() {
  const module = await import('./env.js');
  return module.parseEnv;
}

describe('parseEnv', () => {
  it('parses a valid development env', async () => {
    const parseEnv = await loadParseEnv();
    const parsed = parseEnv(base);
    expect(parsed.PORT).toBe(38101);
    expect(parsed.AUTH_TRUSTED_ORIGINS).toContain('http://localhost:38101');
    expect(parsed.MCP_ALLOWED_ORIGINS).toContain('http://localhost:38101');
  });

  it('requires MCP_REDIS_URL when redis mode is selected', async () => {
    const parseEnv = await loadParseEnv();
    expect(() =>
      parseEnv({
        ...base,
        MCP_SESSION_MODE: 'redis',
      })
    ).toThrowError();
  });

  it('rejects default token ttl larger than max ttl', async () => {
    const parseEnv = await loadParseEnv();
    expect(() =>
      parseEnv({
        ...base,
        AGENT_TOKEN_DEFAULT_TTL_SECONDS: '100',
        AGENT_TOKEN_MAX_TTL_SECONDS: '10',
      })
    ).toThrowError();
  });

  it('enforces https trusted origins in production', async () => {
    const parseEnv = await loadParseEnv();
    expect(() =>
      parseEnv({
        ...base,
        AUTH_SERVER_DOMAIN: 'auth.example.com',
        AUTH_SERVER_URL: 'https://auth.example.com',
        AUTH_TRUSTED_ORIGINS: 'http://auth.example.com',
        BETTER_AUTH_BASE_URL: 'https://auth.example.com',
        MCP_ALLOWED_ORIGINS: 'https://auth.example.com',
        NODE_ENV: 'production',
        TRUST_PROXY: 'true',
      })
    ).toThrowError();
  });

  it('rejects launch-critical secrets shorter than 32 characters', async () => {
    const parseEnv = await loadParseEnv();
    expect(() =>
      parseEnv({
        ...base,
        SERVER_SECRET: '1234567890123456789012345678901',
      })
    ).toThrowError();

    expect(() =>
      parseEnv({
        ...base,
        SERVER_SECRET: '12345678901234567890123456789012',
      })
    ).not.toThrow();
  });

  it('requires email delivery provider configuration in production', async () => {
    const parseEnv = await loadParseEnv();
    expect(() =>
      parseEnv({
        ...base,
        AUTH_SERVER_DOMAIN: 'auth.example.com',
        AUTH_SERVER_URL: 'https://auth.example.com',
        AUTH_TRUSTED_ORIGINS: 'https://app.example.com',
        BETTER_AUTH_BASE_URL: 'https://auth.example.com',
        MCP_ALLOWED_ORIGINS: 'https://app.example.com',
        NODE_ENV: 'production',
        TRUST_PROXY: 'true',
      })
    ).toThrowError();
  });

  it('requires resend env when the resend provider is enabled', async () => {
    const parseEnv = await loadParseEnv();
    expect(() =>
      parseEnv({
        ...base,
        AUTH_EMAIL_PROVIDER: 'resend',
      })
    ).toThrowError();

    expect(() =>
      parseEnv({
        ...base,
        AUTH_EMAIL_FROM: 'EweserDB <no-reply@example.com>',
        AUTH_EMAIL_PROVIDER: 'resend',
        RESEND_API_KEY: 'RESEND_API_KEY_PLACEHOLDER',
      })
    ).not.toThrow();
  });
});
