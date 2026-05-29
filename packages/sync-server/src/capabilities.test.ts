import { describe, expect, it } from 'vitest';
import {
  getCapabilitiesResponse,
  getSyncServerVersion,
} from './capabilities.js';

describe('getSyncServerVersion', () => {
  it('returns a non-empty version string', () => {
    const version = getSyncServerVersion();
    expect(version).toBeTypeOf('string');
    expect(version.length).toBeGreaterThan(0);
  });

  it('returns the same version on repeated calls (cached)', () => {
    const v1 = getSyncServerVersion();
    const v2 = getSyncServerVersion();
    expect(v1).toBe(v2);
  });
});

describe('getCapabilitiesResponse', () => {
  it('returns server, component, version, and capabilities', () => {
    const response = getCapabilitiesResponse({ webhooksEnabled: true });
    expect(response.server).toBe('eweser-db');
    expect(response.component).toBe('sync-server');
    expect(response.version).toBeTypeOf('string');
    expect(response.version.length).toBeGreaterThan(0);
    expect(response.capabilities).toBeDefined();
  });

  it('exposes sync protocol capabilities', () => {
    const response = getCapabilitiesResponse({ webhooksEnabled: true });
    expect(response.capabilities.sync.protocol).toBe('hocuspocus');
    expect(response.capabilities.sync.protocolVersions).toEqual([1]);
    expect(response.capabilities.sync.persistence).toBe('sqlite');
  });

  it('reports webhooks enabled when true', () => {
    const response = getCapabilitiesResponse({ webhooksEnabled: true });
    expect(response.capabilities.sync.webhooks).toBe(true);
  });

  it('reports webhooks disabled when false', () => {
    const response = getCapabilitiesResponse({ webhooksEnabled: false });
    expect(response.capabilities.sync.webhooks).toBe(false);
  });

  it('does not expose secrets or env values', () => {
    const response = getCapabilitiesResponse({ webhooksEnabled: true });
    const serialized = JSON.stringify(response);
    expect(serialized).not.toContain('SECRET');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('DATABASE_URL');
  });
});
