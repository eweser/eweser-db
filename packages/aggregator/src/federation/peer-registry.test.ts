import { describe, expect, it, beforeEach, afterAll } from 'vitest';
import { parsePeers, loadPeers, resetPeerCache } from './peer-registry.js';

describe('parsePeers', () => {
  it('returns empty array for undefined', () => {
    expect(parsePeers(undefined)).toEqual([]);
  });

  it('returns empty array for empty string', () => {
    expect(parsePeers('')).toEqual([]);
  });

  it('parses a single peer', () => {
    const peers = parsePeers(
      'eweser.com|https://aggregator.eweser.com/api|secret1'
    );
    expect(peers).toHaveLength(1);
    expect(peers[0]).toEqual({
      label: 'eweser.com',
      url: 'https://aggregator.eweser.com/api',
      secret: 'secret1',
    });
  });

  it('parses multiple peers', () => {
    const peers = parsePeers(
      'peer1|https://peer1.example.com/api|s1,peer2|https://peer2.example.com/api|s2'
    );
    expect(peers).toHaveLength(2);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const p0 = peers[0]!;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const p1 = peers[1]!;
    expect(p0.label).toBe('peer1');
    expect(p1.label).toBe('peer2');
  });

  it('trims whitespace around peer entries', () => {
    const peers = parsePeers(' peer1 | https://peer1.example.com/api | s1 ');
    expect(peers).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const p = peers[0]!;
    expect(p.label).toBe('peer1');
    expect(p.url).toBe('https://peer1.example.com/api');
    expect(p.secret).toBe('s1');
  });

  it('throws on malformed entry (missing parts)', () => {
    expect(() => parsePeers('label|url')).toThrow(
      'expected "label|url|secret"'
    );
  });

  it('throws on empty label', () => {
    expect(() => parsePeers('|url|secret')).toThrow('must be non-empty');
  });

  it('throws on invalid URL', () => {
    expect(() => parsePeers('label|not-a-url|secret')).toThrow(
      'not a valid URL'
    );
  });
});

describe('loadPeers / resetPeerCache', () => {
  const originalPeers = process.env.TRUSTED_PEERS;

  beforeEach(() => {
    resetPeerCache();
    delete process.env.TRUSTED_PEERS;
  });

  afterAll(() => {
    if (originalPeers !== undefined) {
      process.env.TRUSTED_PEERS = originalPeers;
    } else {
      delete process.env.TRUSTED_PEERS;
    }
    resetPeerCache();
  });

  it('returns empty array when env not set', () => {
    expect(loadPeers()).toEqual([]);
  });

  it('returns parsed peers from env', () => {
    process.env.TRUSTED_PEERS = 'peer1|https://peer1.example.com/api|s1';
    resetPeerCache();
    const peers = loadPeers();
    expect(peers).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const p = peers[0]!;
    expect(p.label).toBe('peer1');
  });

  it('rejects the env override parameter', () => {
    const peers = loadPeers('custom|https://custom.example.com/api|secret');
    expect(peers).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const p2 = peers[0]!;
    expect(p2.label).toBe('custom');
  });
});
