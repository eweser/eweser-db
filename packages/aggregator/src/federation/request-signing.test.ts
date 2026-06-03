import { describe, expect, it } from 'vitest';
import {
  signRequest,
  verifySignature,
  createSignedHeaders,
} from './request-signing.js';
import type { FederationSearchRequest } from './request-signing.js';

const SECRET = 'test-secret';

const body: FederationSearchRequest = {
  query: 'hello world',
  timestamp: Date.now(),
};

describe('signRequest', () => {
  it('produces a hex signature', () => {
    const sig = signRequest(body, SECRET);
    expect(sig).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces deterministic signatures for same input', () => {
    const sig1 = signRequest(body, SECRET);
    const sig2 = signRequest(body, SECRET);
    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different inputs', () => {
    const sig1 = signRequest(body, SECRET);
    const sig2 = signRequest({ ...body, query: 'different query' }, SECRET);
    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const sig1 = signRequest(body, SECRET);
    const sig2 = signRequest(body, 'different-secret');
    expect(sig1).not.toBe(sig2);
  });
});

describe('verifySignature', () => {
  it('verifies a valid signature', () => {
    const sig = signRequest(body, SECRET);
    expect(verifySignature(body, sig, SECRET)).toBe(true);
  });

  it('rejects a wrong signature', () => {
    const sig = signRequest(body, SECRET);
    expect(verifySignature(body, sig, 'wrong-secret')).toBe(false);
  });

  it('rejects tampered body', () => {
    const sig = signRequest(body, SECRET);
    const tampered = { ...body, query: 'tampered query' };
    expect(verifySignature(tampered, sig, SECRET)).toBe(false);
  });
});

describe('createSignedHeaders', () => {
  it('includes Content-Type, signature, and version headers', () => {
    const headers = createSignedHeaders(body, SECRET);
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Eweser-Federation-Signature']).toMatch(/^[0-9a-f]{64}$/);
    expect(headers['X-Eweser-Federation-Version']).toBe('1');
  });

  it('signature header matches signRequest output', () => {
    const headers = createSignedHeaders(body, SECRET);
    const expected = signRequest(body, SECRET);
    expect(headers['X-Eweser-Federation-Signature']).toBe(expected);
  });
});
