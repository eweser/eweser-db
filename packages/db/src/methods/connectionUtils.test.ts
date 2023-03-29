import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { Database } from '..';
import { dummyUserName, dummyUserPass, HOMESERVER_NAME } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning, matrixTestConfig } from '../test-utils/matrixTestUtilServer';
import { createMatrixClient, getOrCreateRegistry, getOrCreateSpace } from './connectionUtils';
import { loginToMatrix } from './login';

const { baseUrl } = matrixTestConfig;
const userLoginInfo = { userId: dummyUserName, password: dummyUserPass, baseUrl };
const userIdWithServer = `@${dummyUserName}:${HOMESERVER_NAME}`;

const spaceAlias = `#eweser-db_space______~${userIdWithServer}`;

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
    expect(whoami?.user_id).toEqual(userIdWithServer);

    const loginInfo = JSON.parse(localStorage.getItem('loginData') || '{}');
    expect(loginInfo.password).toEqual(dummyUserPass);

    // can logout and back in
    await signedInClient.logout();
    // confirm logged out
    try {
      await signedInClient.whoami();
    } catch (error: any) {
      expect(error.message).toEqual(
        `MatrixError: [401] Invalid access token passed. (${baseUrl}/_matrix/client/r0/account/whoami)`
      );
    }

    const signedInClient2 = await createMatrixClient(userLoginInfo);

    const whoami3 = await signedInClient2.whoami();
    expect(whoami3?.user_id).toEqual(userIdWithServer);
    await signedInClient2.logout();
  });
});

describe('getOrCreateRegistry', () => {
  it('Can get or create registry', async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, userLoginInfo);
    const registryAliasReturned = await getOrCreateRegistry(DB);
    expect(registryAliasReturned).toEqual(`#eweser-db_registry_____~${userIdWithServer}`);
  });
});

describe('getOrCreateSpace', () => {
  it('Can get or create a matrix space which is a room that owns other rooms', async () => {
    const matrixClient = await createMatrixClient(userLoginInfo);

    const spaceAliasReturned = await getOrCreateSpace(matrixClient, userIdWithServer);
    expect(spaceAliasReturned).toEqual(spaceAlias);
  });
});
