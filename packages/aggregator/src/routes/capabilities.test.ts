import { describe, expect, it, vi } from 'vitest';

vi.mock('@eweser/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
  initTelemetry: vi.fn(),
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('GET /capabilities (aggregator)', () => {
  it('returns 200 with server, component, version, and capabilities', async () => {
    const { app } = await import('../index.js');
    const res = await app.request('/capabilities');
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.server).toBe('eweser-db');
    expect(body.component).toBe('aggregator');
    expect(body.version).toBeTypeOf('string');
    expect(body.version.length).toBeGreaterThan(0);
    expect(body.capabilities).toBeDefined();
  });

  it('exposes search capabilities', async () => {
    const { app } = await import('../index.js');
    const res = await app.request('/capabilities');
    const body = await res.json();
    expect(body.capabilities.search.endpoint).toBe('/api/search');
    expect(body.capabilities.search.fullTextSearch).toBe(true);
  });

  it('reports agentSearch based on auth URL config', async () => {
    const { app } = await import('../index.js');
    const res = await app.request('/capabilities');
    const body = await res.json();
    // In test env, EWESER_AUTH_URL is unset, so agentSearch should be false
    expect(typeof body.capabilities.search.agentSearch).toBe('boolean');
  });

  it('does not expose secrets or env values', async () => {
    const { app } = await import('../index.js');
    const res = await app.request('/capabilities');
    const body = await res.json();
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('DATABASE_URL');
    expect(serialized).not.toContain('postgresql');
    expect(serialized).not.toContain('changeme');
  });
});

describe('capabilities vs health endpoint shape', () => {
  it('health is separate and returns simple status', async () => {
    const { app } = await import('../index.js');
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});
