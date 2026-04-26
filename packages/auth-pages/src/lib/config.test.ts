import { describe, expect, it } from 'vitest';
import { normalizeAuthApiUrl } from './config';

describe('auth pages config', () => {
  it('keeps an explicit better-auth API mount unchanged', () => {
    expect(normalizeAuthApiUrl('https://auth.eweser.com/api/auth')).toBe(
      'https://auth.eweser.com/api/auth'
    );
  });

  it('adds the better-auth API mount when configured with an origin only', () => {
    expect(normalizeAuthApiUrl('https://auth.eweser.com')).toBe(
      'https://auth.eweser.com/api/auth'
    );
  });

  it('resolves relative API paths against the current origin', () => {
    expect(normalizeAuthApiUrl('/api/auth')).toBe(
      new URL('/api/auth', window.location.origin).toString()
    );
  });
});
