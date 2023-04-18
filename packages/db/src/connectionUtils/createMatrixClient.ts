import { MemoryStore, createClient } from 'matrix-js-sdk';
import type { LoginData } from '../types';
import { LocalStorageKey, localStorageSet } from '../utils/localStorageService';
import { MatrixCrypto } from './matrixCrypto';
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store';
import { IStore } from 'matrix-js-sdk/lib/store';
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
  const tempClient = createClient({ baseUrl });

  let newAccessToken = accessToken;
  let deviceId = null;
  if (accessToken) {
    const res = await tempClient.loginWithToken(accessToken);
    newAccessToken = res.access_token;
    deviceId = res.device_id;
  } else {
    if (!userId) {
      throw new Error('userId is required for password login');
    }
    if (!password) {
      throw new Error('password is required for password login');
    }
    const loginRes: MatrixLoginRes = await tempClient.loginWithPassword(
      userId,
      password
    );
    newAccessToken = loginRes.access_token;
    deviceId = loginRes.device_id;
  }
  const loginSaveData: LoginData = {
    baseUrl,
    userId,
    password,
    accessToken: newAccessToken,
    deviceId,
  };
  localStorageSet(LocalStorageKey.loginData, loginSaveData);
  const cryptoStore = new LocalStorageCryptoStore(localStorage);

  await cryptoStore.startup();

  const matrixClient = createClient({
    ...loginSaveData,
    cryptoStore,
  });
  // overwrites because we don't call .start();
  (matrixClient as any).canSupportVoip = false;
  (matrixClient as any).clientOpts = {
    lazyLoadMembers: true,
  };

  const crypto = new MatrixCrypto(matrixClient);
  await crypto.init();
  await matrixClient.startClient({
    lazyLoadMembers: true,
    initialSyncLimit: 0,
  });
  // prompt for recovery with
  // crypto.createNewKeyBackup(passphrase);

  return matrixClient;
}
