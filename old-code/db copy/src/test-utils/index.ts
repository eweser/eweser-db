import * as http from 'http';
import * as https from 'https';

import type { RegistryData } from '../types';
import { CollectionKey } from '../types';
import {
  buildAliasFromSeed,
  buildRegistryroomId,
  buildSpaceroomId,
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
  const userId = randomString(12);
  const password = randomString(12);

  return {
    baseUrl,
    userId,
    password,
  };
};
export const userIdWithServer = (username: string) =>
  `@${username}:${HOMESERVER_NAME}`;

export const spaceAlias = (username: string) =>
  buildSpaceroomId(userIdWithServer(username));
export const registryAlias = (username: string) =>
  buildRegistryroomId(userIdWithServer(username));

export const testroomId = 'test_room';

export const testroomId = (username: string) =>
  buildAliasFromSeed(testroomId, 'flashcards', userIdWithServer(username));

export const testroomIdName = (username: string) =>
  getAliasNameFromAlias(testroomId(username));

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
          roomId: 'test',
        },
        private: {
          roomId: 'test1',
        },
      },
      notes: {},
    })
  );
};
