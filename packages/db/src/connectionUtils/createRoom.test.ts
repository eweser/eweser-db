import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';
import { createRandomMatrixClient } from '../test-utils/matrixTestUtil';
import { createRoom } from './createRoom';

describe('createRoom', () => {
  it('Can create a room on the matrix server', async () => {
    try {
      const { client } = await createRandomMatrixClient();
      if (!client) throw new Error('No client');
      const room = await createRoom(client, {
        roomAliasName: 'test' + (Math.random() * 10000).toFixed(),
        name: 'Test Room',
        topic: 'This is a test room',
      });
      console.log({ room });
      expect(room).toHaveProperty('room_id');
      expect(room.room_id).toMatch(/^!/);
      expect(room.room_id).toMatch(/:localhost:8888$/);
    } catch (error) {
      console.error(error);
    }
  });
});
