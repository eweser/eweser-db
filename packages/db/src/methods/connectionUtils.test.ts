import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { Database } from '..';
import { dummyUserName, dummyUserPass, HOMESERVER_NAME } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning, matrixTestConfig } from '../test-utils/matrixTestUtilServer';
import { createMatrixClient, getOrCreateSpace } from './connectionUtils';
import { loginToMatrix } from './login';

const { baseUrl } = matrixTestConfig;
const userLoginInfo = { userId: dummyUserName, password: dummyUserPass, baseUrl };

const spaceName = `#eweser-db_space______~${userLoginInfo.userId}`;

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);

describe('createMatrixClient', () => {
  afterEach(() => {
    localStorage.clear();
  });
  it('Can log in to matrix client. Sets login info in localStorage', async () => {
    const signedInClient = await createMatrixClient(userLoginInfo);

    const whoami = await signedInClient.whoami();
    expect(whoami?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);

    const loginInfo = JSON.parse(localStorage.getItem('loginData') || '{}');
    expect(loginInfo.password).toEqual(dummyUserPass);

    // can logout and back in
    await signedInClient.logout();
    // confirm logged out
    try {
      await signedInClient.whoami();
    } catch (error: any) {
      expect(error.message).toEqual('Invalid access token passed.');
    }

    const signedInClient2 = await createMatrixClient(userLoginInfo);

    const whoami3 = await signedInClient2.whoami();
    expect(whoami3?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);
    await signedInClient2.logout();
  });
});

describe('getOrCreateRegistry', () => {
  it('Can get or create registry', async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, userLoginInfo);
  });
});

describe.only('getOrCreateSpace', () => {
  it('Can get or create a matrix space which is a room that owns other rooms', async () => {
    const signedInClient = await createMatrixClient(userLoginInfo);

    const spaceAlias = await getOrCreateSpace(signedInClient, userLoginInfo.userId);
    expect(spaceAlias).toEqual(spaceName);
    console.log('spaceAlias', spaceAlias);
  });
});
