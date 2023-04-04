import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';
import { Database, buildAliasFromSeed, getRegistry, newDocument } from '..';

import { CollectionKey } from '../types';
import { dummyUserName, dummyUserPass, userLoginInfo } from '../test-utils';
import { loginToMatrix } from '../methods/login';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('createAndConnectRoom', () => {
  it(` * 1. Joins the Matrix room if not in it
  * 2. Creates a Y.Doc and saves it to the room object
  * 3. Creates a matrixCRDT provider and saves it to the room object
  * 4. Save the room's metadata to the registry`, async () => {
    const DB = new Database();
    await loginToMatrix(DB, userLoginInfo);
    await DB.connectRegistry();
    const registry = getRegistry(DB);

    // need to have `profiles.public` in the registry so satisfy 'checkRegistryPopulated'
    registry.set(
      '0',
      newDocument('registry.0.0', {
        flashcards: {},
        profiles: {
          public: {
            roomAlias: 'test',
          },
        },
        notes: {},
      })
    );
    const seed = 'test' + (Math.random() * 10000).toFixed();
    const roomAlias = buildAliasFromSeed(
      seed,
      CollectionKey.flashcards,
      DB.userId
    );

    const eventListener = vitest.fn();
    DB.on(eventListener);

    const resRoom = await DB.createAndConnectRoom({
      aliasSeed: seed,
      collectionKey: CollectionKey.flashcards,
      name: 'Name_' + seed,
      topic: 'Topic_' + seed,
    });
    if (!resRoom) throw new Error('resRoom undefined');

    expect(resRoom).toBeDefined();
    expect(resRoom.ydoc).toBeDefined();
    expect(resRoom.matrixProvider).toBeDefined();
    const roomInDB = DB.collections.flashcards[seed];
    expect(roomInDB).toBeDefined();
    expect(roomInDB.roomAlias).toEqual(roomAlias);
    // TODO: figure out why name is not set
    // expect(roomInDB.name).toEqual('Name_' + seed);

    expect(eventListener).toHaveBeenCalled();
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('starting createAndConnectRoom');
    expect(callMessages).toContain('registry populated');
    expect(callMessages).toContain('ydoc created');
    expect(callMessages).toContain('registry updated');
    expect(callMessages).toContain('matrix provider connected');
  });
});
