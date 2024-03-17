import { describe, it, expect } from 'vitest';
import { isTokenExpired } from './';

describe('isTokenExpired', () => {
  it('should return true when expiry date is before 2 minute buffer', () => {
    const slightlyMorThan2Minutes = new Date(
      new Date().getTime() - 1000 * 60 * 2 - 100
    ).toISOString();
    const expired = isTokenExpired(slightlyMorThan2Minutes);
    expect(expired).toBe(true);
  });
  it('should return false if expiry is after default 2 minute buffer', () => {
    const slightlyLessThan2Minutes = new Date(
      new Date().getTime() + 1000 * 60 * 2 + 200
    ).toISOString();
    const expired = isTokenExpired(slightlyLessThan2Minutes);
    expect(expired).toBe(false);
  });
  it('should return true if expiry is before custom buffer', () => {
    const tokenExpiry = new Date(
      new Date().getTime() - 1000 * 60 * 5 - 100
    ).toISOString();
    const expired = isTokenExpired(tokenExpiry, 5);
    expect(expired).toBe(true);
  });
  it('should return false if expiry is after custom buffer', () => {
    const tokenExpiry = new Date(
      new Date().getTime() + 1000 * 60 * 5 + 100
    ).toISOString();
    const expired = isTokenExpired(tokenExpiry, 5);
    expect(expired).toBe(false);
  });
});
