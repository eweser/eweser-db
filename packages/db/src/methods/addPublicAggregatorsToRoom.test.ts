import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';
import { randomString, wait } from '../utils';
import { CollectionKey, Database } from '..';
import { baseUrl, HOMESERVER_NAME, userLoginInfo } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

import type { Flashcard } from '../types';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;

// const localAggregator = 'testAggregator' + randomString(8);
const localAggregator = 'testAggregatorm87axorh';
const localAggregatorUserId = `@${localAggregator}:${HOMESERVER_NAME}`;
const localAggregatorURL = 'wss://localhost:3333';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
  // await createMatrixUser(localAggregator, password);
  // TODO: run the aggregator from here
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

    const room = await db.createAndConnectRoom<Flashcard>({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      isPublic: true,
    });
    await wait(1000);
    expect(room.roomId).toBeDefined();
    const Flashcards = await db.getDocuments(room);
    Flashcards.new({ frontText: 'front', backText: 'back' });
    await db.addPublicAggregatorsToRoom(room);
    // TODO: add event emitters
    // const events = listener.mock.calls
    //   .filter((call) => call[0].event === 'addPublicAggregatorsToRoom')
    //   .map((call) => call[0]);
  }, 80000);
});
