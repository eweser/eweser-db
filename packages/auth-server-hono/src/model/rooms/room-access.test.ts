import { describe, expect, it } from 'vitest';
import { roomAllowsRead, roomAllowsWrite } from './room-access.js';

const room = {
  readAccess: ['reader'],
  writeAccess: ['writer'],
  adminAccess: ['admin'],
};

describe('room access helpers', () => {
  it.each(['reader', 'writer', 'admin'])('allows %s to read', (userId) => {
    expect(roomAllowsRead(room, userId)).toBe(true);
  });

  it('keeps read-only users out of write access', () => {
    expect(roomAllowsWrite(room, 'reader')).toBe(false);
    expect(roomAllowsWrite(room, 'writer')).toBe(true);
    expect(roomAllowsWrite(room, 'admin')).toBe(true);
  });
});
