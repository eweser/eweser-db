import { describe, expect, it, vi } from 'vitest';

vi.mock('../../db/drizzle.js', () => ({ db: {} }));

const { isSignupAllowed } = await import('./alpha-access.js');

describe('isSignupAllowed', () => {
  it('allows everyone when signups are open', () => {
    expect(isSignupAllowed('a@b.co', { mode: 'open', allowlist: [] })).toBe(
      true
    );
  });

  it('allows only allowlisted emails, ignoring case and spaces', () => {
    const config = { mode: 'allowlist' as const, allowlist: ['me@x.co'] };
    expect(isSignupAllowed(' Me@X.co ', config)).toBe(true);
    expect(isSignupAllowed('other@x.co', config)).toBe(false);
  });

  it('blocks everyone when the allowlist is empty', () => {
    expect(
      isSignupAllowed('me@x.co', { mode: 'allowlist', allowlist: [] })
    ).toBe(false);
  });
});
