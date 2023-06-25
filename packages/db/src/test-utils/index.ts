import * as http from 'http';
import * as https from 'https';

import type { RegistryData } from '../types';
import { CollectionKey } from '../types';
import {
  buildAliasFromSeed,
  buildRegistryRoomAlias,
  buildSpaceRoomAlias,
  getAliasNameFromAlias,
  getRegistry,
  newDocument,
  randomString,
} from '../utils';
import type { Database } from '..';
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
  const userId = 'userId' + randomString(12);
  const password = 'password123!';

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

export const populateTestRegistry = async (db: Database) => {
  await db.connectRegistry();

  const registry = getRegistry(db);

  // need to have `profiles.public` in the registry so satisfy 'checkRegistryPopulated'
  registry.set(
    '0',
    newDocument<RegistryData>('registry.0.0', {
      flashcards: {},
      profiles: {
        public: {
          roomAlias: 'test',
        },
        private: {
          roomAlias: 'test1',
        },
      },
      notes: {},
    })
  );
};
