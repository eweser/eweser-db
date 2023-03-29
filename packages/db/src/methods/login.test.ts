import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { Database } from '..';
import { dummyUserName, dummyUserPass, HOMESERVER_NAME } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning, matrixTestConfig } from '../test-utils/matrixTestUtilServer';
import { loginToMatrix } from './login';

const { baseUrl } = matrixTestConfig;

describe('connectRoom', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
    await createMatrixUser(dummyUserName, dummyUserPass);
  }, 60000);
  afterEach(() => {
    localStorage.clear();
  });
  it('Can log in to matrix client. Sets login info in localStorage', async () => {
    const DB = new Database({ baseUrl });

    await loginToMatrix(DB, {
      userId: dummyUserName,
      password: dummyUserPass,
      baseUrl,
    });

    expect(DB.userId).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);
    const whoami = await DB.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);

    const loginInfo = JSON.parse(localStorage.getItem('loginData') || '{}');
    expect(loginInfo.password).toEqual(dummyUserPass);
  });
});
