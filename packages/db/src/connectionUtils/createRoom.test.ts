import { describe, it, expect } from 'vitest';
import { createRandomMatrixClient } from '../test-utils/matrixTestUtil';
import { createRoom } from './createRoom';

describe('createRoom', () => {
  it('Can create a room on the matrix server', async () => {
    const { client } = await createRandomMatrixClient();
    if (!client) throw new Error('No client');
    const room = await createRoom(client, {
      roomAliasName: 'test' + (Math.random() * 10000).toFixed(),
      name: 'Test Room',
      topic: 'This is a test room',
    });

    expect(room).toHaveProperty('room_id');
    expect(room.room_id).toMatch(/^!/);
    expect(room.room_id).toMatch(/:localhost:8888$/);
  });
});
