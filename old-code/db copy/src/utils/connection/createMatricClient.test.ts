import { describe, it, expect, beforeAll, afterEach } from 'vitest';

import { userIdWithServer, userLoginInfo } from '../../test-utils';
import { createMatrixUser } from '../../test-utils/matrixTestUtil';
import {
  ensureMatrixIsRunning,
  initMatrixSDK,
} from '../../test-utils/matrixTestUtilServer';
import { createMatrixClient } from './createMatrixClient';
import { LocalStorageKey, localStorageGet } from '../db/localStorageService';
import type { LoginData } from '../../types';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;

beforeAll(async () => {
  initMatrixSDK();
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('createMatrixClient', () => {
  it('Can log in to matrix client. Sets login info in localStorage', async () => {
    const signedInClient = await createMatrixClient(loginInfo);

    const whoami = await signedInClient.whoami();
    expect(whoami?.user_id).toEqual(userIdWithServer(userId));

    const loginData = localStorageGet<LoginData>(LocalStorageKey.loginData);
    expect(loginData?.password).toEqual(password);

    // can logout and back in
    await signedInClient.logout();
    // confirm logged out
    try {
      await signedInClient.whoami();
    } catch (error: any) {
      expect(error.message.includes('Invalid access token')).toEqual(true);
    }

    const signedInClient2 = await createMatrixClient(loginInfo);

    const whoami3 = await signedInClient2.whoami();
    expect(whoami3?.user_id).toEqual(userIdWithServer(userId));
    await signedInClient2.logout();
  });
});
