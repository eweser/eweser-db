import { describe, expect, it } from 'vitest';
import { generateLoginUrl } from './generateLoginUrl';
import type { Database } from '../..';

describe('generateLoginUrl', () => {
  it('builds login url from defaults when optional fields are omitted', () => {
    const db = { authServer: 'https://auth.example.com' } as Database;

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          href: 'https://app.example.com/notes?token=abc',
          host: 'app.example.com',
        },
      },
      configurable: true,
    });

    const url = generateLoginUrl(db)({ name: 'Example App' });
    const parsed = new URL(url);

    expect(parsed.origin).toBe('https://auth.example.com');
    expect(parsed.pathname).toBe('/auth/sign-in');
    expect(parsed.searchParams.get('name')).toBe('Example App');
    expect(parsed.searchParams.get('domain')).toBe('app.example.com');
    expect(parsed.searchParams.get('collections')).toBe('all');
    expect(parsed.searchParams.get('redirect')).toBe(
      'https://app.example.com/notes'
    );
  });

  it('uses explicit redirect/domain/collections when provided', () => {
    const db = { authServer: 'https://auth.example.com' } as Database;

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          href: 'https://app.example.com/notes',
          host: 'app.example.com',
        },
      },
      configurable: true,
    });

    const url = generateLoginUrl(db)({
      name: 'Example App',
      domain: 'custom.example.com',
      redirect: 'https://custom.example.com/return',
      collections: ['notes', 'profiles'],
    });

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/auth/sign-in');
    expect(parsed.searchParams.get('domain')).toBe('custom.example.com');
    expect(parsed.searchParams.get('redirect')).toBe(
      'https://custom.example.com/return'
    );
    expect(parsed.searchParams.get('collections')).toBe('notes|profiles');
  });

  it('preserves a nested auth server base path', () => {
    const db = { authServer: 'https://auth.example.com/base/' } as Database;

    Object.defineProperty(globalThis, 'window', {
      value: {
        location: {
          href: 'https://app.example.com/notes',
          host: 'app.example.com',
        },
      },
      configurable: true,
    });

    const url = generateLoginUrl(db)({ name: 'Example App' });
    const parsed = new URL(url);

    expect(parsed.pathname).toBe('/base/auth/sign-in');
  });
});
