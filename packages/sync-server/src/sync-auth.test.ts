import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { authenticateSyncConnection } from './sync-auth.js';

const secret = 'test-secret';

function token(claims: Record<string, unknown>) {
  return jwt.sign(claims, secret);
}

describe('authenticateSyncConnection', () => {
  it('marks a read-only token connection as read only', () => {
    const connection = { readOnly: false };
    const context = authenticateSyncConnection({
      connection,
      secret,
      token: token({
        roomId: 'room-memory',
        userId: 'reader-1',
        collectionKey: 'notes',
        readOnly: true,
      }),
    });

    expect(connection.readOnly).toBe(true);
    expect(context).toMatchObject({
      roomId: 'room-memory',
      userId: 'reader-1',
      collectionKey: 'notes',
    });
  });

  it('keeps a writer token connection writable', () => {
    const connection = { readOnly: true };
    authenticateSyncConnection({
      connection,
      secret,
      token: token({ roomId: 'room-memory', userId: 'writer-1' }),
    });

    expect(connection.readOnly).toBe(false);
  });

  it('rejects missing or invalid tokens', () => {
    expect(() =>
      authenticateSyncConnection({
        connection: { readOnly: false },
        secret,
        token: undefined,
      })
    ).toThrow('Authentication required');
    expect(() =>
      authenticateSyncConnection({
        connection: { readOnly: false },
        secret,
        token: 'not-a-jwt',
      })
    ).toThrow('Invalid token');
  });
});
