import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { Database } from '../..';
import {
  baseUrl,
  userLoginInfo,
  registryAlias,
  spaceAlias,
} from '../../test-utils';
import { createMatrixUser } from '../../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../../test-utils/matrixTestUtilServer';
import { loginToMatrix } from '../../methods/login';
import {
  getOrCreateRegistryRoom,
  getOrCreateSpace,
} from './getOrCreateRegistryAndSpace';
const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('getOrCreateRegistry', () => {
  it('Can get or create registry', async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, loginInfo);
    const registryAliasReturned = await getOrCreateRegistryRoom(DB);
    expect(registryAliasReturned.registryroomId).toEqual(registryAlias(userId));
  });
});

describe('getOrCreateSpace', () => {
  it('Can get or create a matrix space which is a room that owns other rooms', async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, loginInfo);
    const spaceAliasReturned = await getOrCreateSpace(DB);
    expect(spaceAliasReturned).toEqual(spaceAlias(userId));
  });
});
