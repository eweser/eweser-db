import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildPermissionPath,
  clearStoredLoginQuery,
  getLoginQueryFromSearch,
  getStoredLoginQuery,
  resolvePostAuthPath,
  setStoredLoginQuery,
  validateLoginQueryOptions,
} from './login-query';

describe('login query helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('validates and normalizes login query options', () => {
    expect(
      validateLoginQueryOptions({
        collections: 'notes|profiles',
        domain: 'example.com',
        name: 'Example App',
        redirect: 'https://example.com/callback',
      })
    ).toEqual({
      collections: ['notes', 'profiles'],
      domain: 'example.com',
      name: 'Example App',
      redirect: 'https://example.com/callback',
    });
  });

  it('rejects invalid login query values', () => {
    expect(
      validateLoginQueryOptions({
        collections: 'notes|unknown',
        domain: 'example.com',
        name: 'Example App',
        redirect: 'https://example.com/callback',
      })
    ).toBeNull();

    expect(
      validateLoginQueryOptions({
        collections: 'notes',
        domain: 'example.com',
        name: 'Example App',
        redirect: 'https://evil.example/callback',
      })
    ).toBeNull();

    expect(
      validateLoginQueryOptions({
        collections: 'notes',
        domain: 'example.com',
        name: '',
        redirect: 'https://example.com/callback',
      })
    ).toBeNull();
  });

  it('round-trips stored login query state in localStorage', () => {
    const query = {
      collections: ['notes', 'profiles'] as const,
      domain: 'example.com',
      name: 'Example App',
      redirect: 'https://example.com/callback',
    };

    setStoredLoginQuery(query);

    expect(getStoredLoginQuery()).toEqual(query);

    clearStoredLoginQuery();

    expect(getStoredLoginQuery()).toBeNull();
  });

  it('builds the permission path and post-auth redirect path', () => {
    const query = {
      collections: ['all'] as const,
      domain: 'example.com',
      name: 'Example App',
      redirect: 'https://example.com/callback',
    };

    const permissionPath = buildPermissionPath(query);
    const permissionUrl = new URL(`https://auth.example.com${permissionPath}`);

    expect(permissionUrl.pathname).toBe('/access-grant/permission');
    expect(permissionUrl.searchParams.get('domain')).toBe('example.com');
    expect(permissionUrl.searchParams.get('collections')).toBe('all');
    expect(permissionUrl.searchParams.get('redirect')).toBe(
      'https://example.com/callback'
    );

    expect(resolvePostAuthPath(query, '/home')).toBe(permissionPath);
    expect(resolvePostAuthPath(null, '/account/security')).toBe(
      '/account/security'
    );
    expect(resolvePostAuthPath(null, 'https://example.com/security')).toBe('/');
    expect(resolvePostAuthPath(null, null)).toBe('/');
    expect(resolvePostAuthPath(null, '//evil.example.com')).toBe('/');
  });

  it('parses login query params from the URL search string', () => {
    const query = getLoginQueryFromSearch(
      new URLSearchParams(
        'collections=notes|profiles&domain=example.com&name=Example%20App&redirect=https%3A%2F%2Fexample.com%2Fcallback'
      )
    );

    expect(query).toEqual({
      collections: ['notes', 'profiles'],
      domain: 'example.com',
      name: 'Example App',
      redirect: 'https://example.com/callback',
    });
  });
});
