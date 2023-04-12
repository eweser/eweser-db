import { describe, it, expect } from 'vitest';
import { Database } from '..';
import { baseUrl, userLoginInfo } from '../test-utils';
import { loginToMatrix } from './login';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

describe('connectRegistry', () => {
  ensureMatrixIsRunning();
  it('can connect, or create registry', async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, userLoginInfo);
    await DB.connectRegistry();
    const registryRoom = DB.collections.registry[0];
    expect(registryRoom.ydoc?.store).toBeDefined();
    expect(registryRoom.connectStatus).toEqual('ok');
    expect(registryRoom.matrixProvider?.roomId).toEqual(registryRoom.roomId);
  });
});
