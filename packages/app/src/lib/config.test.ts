import { describe, expect, it } from 'vitest';
import { getAuthEndpoints } from './config';

describe('getAuthEndpoints', () => {
  it('uses the production same-origin proxy despite external build settings', () => {
    expect(
      getAuthEndpoints({
        origin: 'https://login.example.test',
        production: true,
        configuredApiUrl: 'https://unreachable.example.test/api/auth',
        configuredServerUrl: 'https://unreachable.example.test',
      })
    ).toEqual({
      authApiUrl: 'https://login.example.test/api/auth',
      authServerUrl: 'https://unreachable.example.test',
      authApiServerUrl: 'https://login.example.test',
    });
  });

  it('accepts local development overrides', () => {
    expect(
      getAuthEndpoints({
        origin: 'http://localhost:3001',
        production: false,
        configuredApiUrl: 'http://localhost:38101/api/auth',
        configuredServerUrl: 'http://localhost:38101',
      })
    ).toEqual({
      authApiUrl: 'http://localhost:38101/api/auth',
      authServerUrl: 'http://localhost:38101',
      authApiServerUrl: 'http://localhost:38101',
    });
  });
});
