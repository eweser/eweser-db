import * as http from 'http';
import * as https from 'https';

import type { Database } from '@eweser/db';
import {
  randomString,
  buildSpaceRoomAlias,
  buildRegistryRoomAlias,
  buildAliasFromSeed,
  CollectionKey,
  getAliasNameFromAlias,
  getRegistry,
  newDocument,
} from '@eweser/db';
import type { RegistryData } from '@eweser/db/types/types';
import {
  waitForSocketState,
  sendMessage,
  waitForMessage,
} from '@eweser/websockets';
import { WebSocket } from 'ws';
import { expect } from 'vitest';
http.globalAgent.maxSockets = 2000;
https.globalAgent.maxSockets = 2000;

export const localWebRtcServer = 'ws://localhost:4444';

export const HOMESERVER_NAME = 'localhost:8888';
export const matrixTestConfig = {
  baseUrl: 'http://' + HOMESERVER_NAME,
};
export const MATRIX_HOME_URL = new URL('http://localhost:8888/_matrix/static/');

export const { baseUrl } = matrixTestConfig;
const localAggregator = 'testAggregatorm87axorh';
export const localAggregatorUserId = `@${localAggregator}:${HOMESERVER_NAME}`;
export const localAggregatorURL = 'wss://localhost:3333';
import Matrix from 'matrix-js-sdk';
import request from 'request';

Matrix.request(request);

export const userLoginInfo = () => {
  const userId = 'userid' + randomString(8);
  const password = 'Password123!';

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

export const pingTestServer = async () => {
  const client = new WebSocket('wss://localhost:3333');
  await waitForSocketState(client, client.OPEN);
  sendMessage(client, { type: 'ping' });
  const pong = await waitForMessage(client, 'pong');
  expect(pong).toEqual({ type: 'pong' });
};
