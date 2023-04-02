import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { createRoom } from './createRoom';
import { loginToMatrix } from '../methods/login';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  userLoginInfo,
} from '../test-utils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import type { IDatabase } from '..';
import { Database } from '..';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('createRoom', () => {
  it('Can create a room on the matrix server', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    const client = await loginToMatrix(DB, userLoginInfo);
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
