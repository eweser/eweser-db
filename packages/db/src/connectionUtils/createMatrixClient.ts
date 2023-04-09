import { createClient } from 'matrix-js-sdk';
import type { LoginData } from '../types';
import { LocalStorageKey, localStorageSet } from '../utils/localStorageService';

type MatrixLoginRes = {
  access_token: string;
  device_id: string;
  home_server: string;
  user_id: string;
  well_known: { 'm.homeserver': { base_url: string } };
};

/** logs into matrix. if successful sets login data into localStorage */
export async function createMatrixClient(data: LoginData) {
  // console.log({ data });
  const { password, accessToken, baseUrl, userId } = data;
  const signInOpts = {
    baseUrl,
    userId,
  };
  const matrixClient = accessToken
    ? createClient({
        ...signInOpts,
        accessToken,
      })
    : createClient(signInOpts);

  // overwrites because we don't call .start();
  (matrixClient as any).canSupportVoip = false;
  (matrixClient as any).clientOpts = {
    lazyLoadMembers: true,
  };

  if (accessToken) {
    await matrixClient.loginWithToken(accessToken);
  } else {
    if (!userId) {
      throw new Error('userId is required for password login');
    }
    if (!password) {
      throw new Error('password is required for password login');
    }
    const loginRes: MatrixLoginRes = await matrixClient.loginWithPassword(
      userId,
      password
    );

    const loginSaveData: LoginData = {
      baseUrl,
      userId,
      password,
      // TODO: reimplement this. For some reason matrix server is not accepting the token.
      // accessToken: loginRes.access_token,
      deviceId: loginRes.device_id,
    };
    localStorageSet(LocalStorageKey.loginData, loginSaveData);
  }

  return matrixClient;
}
