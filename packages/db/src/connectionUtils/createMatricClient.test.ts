import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  userIdWithServer,
  userLoginInfo,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import {
  ensureMatrixIsRunning,
  initMatrixSDK,
} from '../test-utils/matrixTestUtilServer';
import { createMatrixClient } from './createMatrixClient';

beforeAll(async () => {
  initMatrixSDK();
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('createMatrixClient', () => {
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
      expect(error.message.includes('Invalid access token')).toEqual(true);
    }

    const signedInClient2 = await createMatrixClient(userLoginInfo);

    const whoami3 = await signedInClient2.whoami();
    expect(whoami3?.user_id).toEqual(userIdWithServer);
    await signedInClient2.logout();
  });
});
