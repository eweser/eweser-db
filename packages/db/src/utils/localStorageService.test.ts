import { describe, expect, it } from 'vitest';
import {
  LocalStorageKey,
  localStorageLogValue,
} from './localStorageService.js';

describe('localStorageLogValue', () => {
  it('redacts access-grant tokens', () => {
    expect(
      localStorageLogValue(LocalStorageKey.accessGrantToken, 'secret-jwt')
    ).toBe('[redacted]');
  });

  it('keeps non-credential registry diagnostics available', () => {
    const registry = [{ id: 'room-1' }];
    expect(localStorageLogValue(LocalStorageKey.roomRegistry, registry)).toBe(
      registry
    );
  });
});
