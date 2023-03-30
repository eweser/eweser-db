import * as http from 'http';
import * as https from 'https';
import type { MatrixClient } from 'matrix-js-sdk';
import { createClient, MemoryStore } from 'matrix-js-sdk';
import { uuid } from 'vscode-lib';
import { createMatrixRoom } from './matrixRoomManagement';
import { matrixTestConfig } from './matrixTestUtilServer';

http.globalAgent.maxSockets = 2000;
https.globalAgent.maxSockets = 2000;

const TEST_PASSWORD = 'testpass';

export async function createRandomMatrixClient() {
  const testId = uuid.generateUuid();
  const username = 'testuser_' + testId;

  const client = await createMatrixUser(username, TEST_PASSWORD);

  return {
    username,
    client,
  };
}

export async function createRandomMatrixClientAndRoom(
  access: 'public-read-write' | 'public-read'
) {
  const { client, username } = await createRandomMatrixClient();
  const roomName = '@' + username + '/test';
  const result = await createMatrixRoom(client, roomName, access);

  if (typeof result === 'string' || result.status !== 'ok') {
    throw new Error("couldn't create room");
  }

  return {
    client,
    roomId: result.roomId,
    roomName,
  };
}

export const loginMatrixUser = async (
  username: string,
  password: string,
  matrixClient?: MatrixClient
) => {
  if (!matrixClient) {
    matrixClient = createClient({
      baseUrl: matrixTestConfig.baseUrl,
      // accessToken: access_token,
      // userId: user_id,
      // deviceId: device_id,
    });
  }
  const loginResult = await matrixClient.loginWithPassword(username, password);
  // console.log(result);
  // result.access_token
  const matrixClientLoggedIn = createClient({
    baseUrl: matrixTestConfig.baseUrl,
    accessToken: loginResult.access_token,
    store: new MemoryStore() as any,
    userId: loginResult.user_id,
    deviceId: loginResult.device_id,
  });

  matrixClientLoggedIn.initCrypto();
  (matrixClientLoggedIn as any).canSupportVoip = false;
  (matrixClientLoggedIn as any).clientOpts = {
    lazyLoadMembers: true,
  };
  return matrixClientLoggedIn;
};

export async function createMatrixUser(username: string, password: string) {
  console.log('create', username);
  const matrixClient = createClient({
    baseUrl: matrixTestConfig.baseUrl,
    // accessToken: access_token,
    // userId: user_id,
    // deviceId: device_id,
  });
  let sessionId = '';
  // first get a session_id. this is returned in a 401 response :/
  try {
    const result = await matrixClient.register(
      username,
      password,
      null,
      undefined as any
    );
  } catch (e: any) {
    if (e.data.errcode === 'M_USER_IN_USE') {
      return loginMatrixUser(username, password, matrixClient);
    }
    sessionId = e.data.session;
  }

  if (!sessionId) {
    throw new Error('unexpected, no sessionId set');
  }
  // now register

  const result = await matrixClient.register(username, password, sessionId, {
    type: 'm.login.dummy',
  });
  //   console.log(result);

  // login
}
