import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createMatrixUser } from '../../test-utils/matrixTestUtil';
import { createRoom } from './createRoom';
import { loginToMatrix } from '../../methods/login';
import { baseUrl, userLoginInfo } from '../../test-utils';
import { ensureMatrixIsRunning } from '../../test-utils/matrixTestUtilServer';
import { randomString } from '..';

import { Database } from '../..';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('createRoom', () => {
  it('Can create a room on the matrix server', async () => {
    const db = new Database({ baseUrl });
    const client = await loginToMatrix(db, loginInfo);
    if (!client) throw new Error('No client');
    const room = await createRoom(client, {
      roomIdName: 'test' + randomString(8),
      name: 'Test Room',
      topic: 'This is a test room',
    });

    expect(room).toHaveProperty('room_id');
    expect(room.room_id).toMatch(/^!/);
    expect(room.room_id).toMatch(/:localhost:8888$/);
  });
});
