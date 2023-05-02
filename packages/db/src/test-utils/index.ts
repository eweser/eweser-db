import * as http from 'http';
import * as https from 'https';
import {
  buildAliasFromSeed,
  buildRegistryRoomAlias,
  buildSpaceRoomAlias,
  getAliasNameFromAlias,
} from '../connection';
import { CollectionKey } from '../types';
import { randomString } from '../utils';
http.globalAgent.maxSockets = 2000;
https.globalAgent.maxSockets = 2000;

export const localWebRtcServer = 'ws://localhost:4444';

export const HOMESERVER_NAME = 'localhost:8888';
export const matrixTestConfig = {
  baseUrl: 'http://' + HOMESERVER_NAME,
  // idBaseUrl: "https://vector.im",
};
export const MATRIX_HOME_URL = new URL('http://localhost:8888/_matrix/static/');

export const { baseUrl } = matrixTestConfig;
export const userLoginInfo = () => {
  const userId = randomString(8);
  const password = randomString(8);
  return {
    baseUrl,
    userId,
    password,
  };
};
export const userIdWithServer = (username: string) =>
  `@${username}:${HOMESERVER_NAME}`;

export const spaceAlias = (username: string) =>
  buildSpaceRoomAlias(userIdWithServer(username));
export const registryAlias = (username: string) =>
  buildRegistryRoomAlias(userIdWithServer(username));

export const testAliasSeed = 'test_room';

export const testRoomAlias = (username: string) =>
  buildAliasFromSeed(
    testAliasSeed,
    CollectionKey.flashcards,
    userIdWithServer(username)
  );

export const testRoomAliasName = (username: string) =>
  getAliasNameFromAlias(testRoomAlias(username));
