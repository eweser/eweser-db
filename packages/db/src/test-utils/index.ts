import * as http from 'http';
import * as https from 'https';
http.globalAgent.maxSockets = 2000;
https.globalAgent.maxSockets = 2000;

export const HOMESERVER_NAME = 'localhost:8888';
export const matrixTestConfig = {
  baseUrl: 'http://' + HOMESERVER_NAME,
  // idBaseUrl: "https://vector.im",
};
export const MATRIX_HOME_URL = new URL('http://localhost:8888/_matrix/static/');
export const dummyUserName = 'dummy';
export const dummyUserPass = 'dumdum';
export const { baseUrl } = matrixTestConfig;
export const userLoginInfo = {
  userId: dummyUserName,
  password: dummyUserPass,
  baseUrl,
};
export const userIdWithServer = `@${dummyUserName}:${HOMESERVER_NAME}`;

export const spaceAlias = `#eweser-db_space______~${userIdWithServer}`;
export const registryAlias = `#eweser-db_registry_____~${userIdWithServer}`;

export const testRoomAliasKey = 'test-room';
export const testRoomAlias = `#${testRoomAliasKey}~${userIdWithServer}`;
