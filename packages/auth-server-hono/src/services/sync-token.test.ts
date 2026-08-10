import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../env.js', () => ({
  env: {
    SERVER_SECRET: 'test-secret',
    SYNC_AUTH_SECRET: 'test-secret',
  },
}));

const { generateSyncToken, verifySyncToken } = await import('./sync-token.js');

describe('sync tokens', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-10T00:00:00.000Z'));
  });

  it('carries a read-only claim only for read-only room access', () => {
    const readOnly = generateSyncToken(
      'room-memory',
      'notes',
      'reader-1',
      'private',
      true
    );
    const writable = generateSyncToken(
      'room-memory',
      'notes',
      'writer-1',
      'private',
      false
    );

    expect(verifySyncToken(readOnly.token)).toMatchObject({
      roomId: 'room-memory',
      userId: 'reader-1',
      readOnly: true,
    });
    expect(verifySyncToken(writable.token).readOnly).toBeUndefined();
  });
});
