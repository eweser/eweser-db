import { describe, it, expect, beforeAll } from 'vitest';
import { Database } from '..';
import { baseUrl, userLoginInfo } from '../test-utils';
import { loginToMatrix } from './login';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { createMatrixUser } from '../test-utils/matrixTestUtil';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);

describe('connectRegistry', () => {
  ensureMatrixIsRunning();
  it('can connect, or create registry', async () => {
    const db = new Database({ baseUrl });
    await loginToMatrix(db, loginInfo);
    await db.connectRegistry();
    const registryRoom = db.collections.registry[0];
    expect(registryRoom.ydoc?.store).toBeDefined();
    expect(registryRoom.connectStatus).toEqual('ok');
    expect(registryRoom.matrixProvider?.roomId).toEqual(registryRoom.roomId);
  }, 10000);
});
