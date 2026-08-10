import { describe, expect, it } from 'vitest';
import { canWriteRoom } from './room-write-access';

describe('canWriteRoom', () => {
  it('keeps unsynced local rooms writable', () => {
    expect(
      canWriteRoom(
        { syncUrl: null, writeAccess: [], adminAccess: [] },
        undefined
      )
    ).toBe(true);
  });

  it('allows remote writers and admins', () => {
    const room = {
      syncUrl: 'wss://sync.example.test',
      writeAccess: ['writer'],
      adminAccess: ['admin'],
    };
    expect(canWriteRoom(room, 'writer')).toBe(true);
    expect(canWriteRoom(room, 'admin')).toBe(true);
  });

  it('fails closed for remote readers and unresolved identities', () => {
    const room = {
      syncUrl: 'wss://sync.example.test',
      writeAccess: ['writer'],
      adminAccess: [],
    };
    expect(canWriteRoom(room, 'reader')).toBe(false);
    expect(canWriteRoom(room, undefined)).toBe(false);
  });
});
