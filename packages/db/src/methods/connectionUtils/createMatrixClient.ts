import sdk from 'matrix-js-sdk';
import type { LoginData } from '../../types';

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
    ? sdk.createClient({
        ...signInOpts,
        accessToken,
      })
    : sdk.createClient(signInOpts);

  if (accessToken) {
    await matrixClient.loginWithToken(accessToken);
  } else {
    const loginRes: MatrixLoginRes = await matrixClient.login(
      'm.login.password',
      {
        user: userId,
        password,
      }
    );
    // console.log({ loginRes });
    const loginSaveData: LoginData = {
      baseUrl,
      userId,
      password,
      // TODO: reimplement this. For some reason matrix server is not accepting the token.
      // accessToken: loginRes.access_token,
      deviceId: loginRes.device_id,
    };
    localStorage.setItem('loginData', JSON.stringify(loginSaveData));
  }

  // overwrites because we don't call .start();
  (matrixClient as any).canSupportVoip = false;
  (matrixClient as any).clientOpts = {
    lazyLoadMembers: true,
  };
  return matrixClient;
}
