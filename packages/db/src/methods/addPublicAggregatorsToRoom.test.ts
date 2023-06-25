import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';
import type { LoginData } from '..';
import { buildAliasFromSeed, randomString, wait } from '../utils';
import { CollectionKey, Database } from '..';
import { baseUrl, HOMESERVER_NAME, userLoginInfo } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { loginToMatrix } from './login';
import {
  localStorageGet,
  LocalStorageKey,
} from '../utils/db/localStorageService';
import { WebSocket } from 'ws';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
function waitForSocketState(socket: WebSocket, state: WebSocket['OPEN']) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      if (socket.readyState === state) {
        resolve(1);
      } else {
        waitForSocketState(socket, state).then(resolve);
      }
    }, 5);
  });
}
// const localAggregator = 'testAggregator' + randomString(8);
const localAggregator = 'testAggregatorm87axorh';
const localAggregatorUserId = `@${localAggregator}:${HOMESERVER_NAME}`;
const localAggregatorURL = 'wss://localhost:3333';
console.log(password, localAggregatorUserId);
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
  // await createMatrixUser(localAggregator, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('addPublicAggregatorsToRoom', () => {
  it('adds all of the listed public aggregators to the room', async () => {
    const db = new Database({
      baseUrl,
      publicAggregators: [
        { userId: localAggregatorUserId, url: localAggregatorURL },
      ],
      // debug: true,
    });
    const listener = vitest.fn();
    db.on('test', listener);

    await db.login(loginInfo);

    const aliasSeed = 'test' + randomString(8);

    const room = await db.createAndConnectRoom({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      publicRoom: true,
    });
    await wait(1000);
    console.log(room.roomId);
    expect(room.roomId).toBeDefined();

    const res = await db.addPublicAggregatorsToRoom(room);
    console.log({ res });
    console.log(localAggregatorURL);

    const events = listener.mock.calls
      .filter((call) => call[0].event === 'addPublicAggregatorsToRoom')
      .map((call) => call[0]);
    console.log(events);
  }, 80000);
});
