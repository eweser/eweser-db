import { createClient } from 'matrix-js-sdk';
import type { LoginData } from '../types';
import { LocalStorageKey, localStorageSet } from '../utils/localStorageService';
import { buildFullUserId } from '../utils';

type MatrixLoginRes = {
  access_token: string;
  device_id: string;
  home_server: string;
  user_id: string;
  well_known: { 'm.homeserver': { base_url: string } };
};

/**
 * The userId can be either the full userId which includes the homeserver or just the local part e.g. "@alice:matrix.org" or "alice"
 *
 * logs into matrix. if successful sets login data into localStorage */
export async function createMatrixClient(data: LoginData) {
  // console.log({ data });
  const { password, baseUrl, userId: userIdSeed } = data;
  let { accessToken, deviceId } = data;

  if (!userIdSeed) {
    throw new Error('userId is required for login');
  }
  // make sure id includes homeserver
  const userId =
    userIdSeed.includes('@') && userIdSeed.includes(':')
      ? userIdSeed
      : buildFullUserId(userIdSeed, baseUrl);

  const tempClient = createClient({ baseUrl });
  if (!accessToken || !deviceId) {
    if (!password) {
      throw new Error('password is required for password login');
    }
    const loginRes: MatrixLoginRes = await tempClient.loginWithPassword(
      userId,
      password
    );
    deviceId = loginRes.device_id;
    accessToken = loginRes.access_token;
  }

  const matrixClient = createClient({
    baseUrl,
    userId,
    accessToken,
    deviceId,
  });

  const loginSaveData: LoginData = {
    baseUrl,
    userId,
    password,
    accessToken,
    deviceId,
  };
  localStorageSet(LocalStorageKey.loginData, loginSaveData);

  // overwrites because we don't call .start();
  (matrixClient as any).canSupportVoip = false;
  (matrixClient as any).clientOpts = {
    lazyLoadMembers: true,
  };

  return matrixClient;
}
