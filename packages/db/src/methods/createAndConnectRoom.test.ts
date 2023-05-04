import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';
import {
  Database,
  buildAliasFromSeed,
  getRegistry,
  newDocument,
  randomString,
} from '..';

import type {
  CreateAndConnectRoomOptions,
  Flashcard,
  RegistryData,
} from '../types';
import { CollectionKey } from '../types';
import { userLoginInfo } from '../test-utils';
import { loginToMatrix } from '../methods/login';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import type { FlashcardBase } from '../collections';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('createAndConnectRoom', () => {
  it(` * 1. Joins the Matrix room if not in it
  * 2. Creates a Y.Doc and saves it to the room object
  * 3. Creates a matrixCRDT provider and saves it to the room object
  * 4. Save the room's metadata to the registry`, async () => {
    const db = new Database();
    await loginToMatrix(db, loginInfo);
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
        },
        notes: {},
      })
    );
    const aliasSeed = 'test' + randomString(8);
    const roomAlias = buildAliasFromSeed(
      aliasSeed,
      CollectionKey.flashcards,
      db.userId
    );

    const eventListener = vitest.fn();
    db.on('test', eventListener);

    const resRoom = await db.createAndConnectRoom({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      name: 'Name_' + aliasSeed,
      topic: 'Topic_' + aliasSeed,
    });
    if (!resRoom) throw new Error('resRoom undefined');

    expect(resRoom).toBeDefined();
    expect(resRoom.ydoc?.store).toBeDefined();
    expect(resRoom.matrixProvider).toBeDefined();
    const roomInDB = db.collections.flashcards[aliasSeed];
    expect(roomInDB).toBeDefined();
    expect(roomInDB.roomAlias).toEqual(roomAlias);
    // TODO: figure out why name is not set
    // expect(roomInDB.name).toEqual('Name_' + seed);

    expect(eventListener).toHaveBeenCalled();
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('starting createAndConnectRoom');
    expect(callMessages).toContain('registry was already populated');
    expect(callMessages).toContain('ydoc created');
    expect(callMessages).toContain('registry updated');
    expect(callMessages).toContain('matrix provider connected');
  });
  it('takes in initial values and saves them to the collection', async () => {
    const db = new Database();
    await loginToMatrix(db, loginInfo);
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
        },
        notes: {},
      })
    );
    const aliasSeed = 'test' + randomString(8);

    const eventListener = vitest.fn();
    db.on('test', eventListener);

    // test that passed in _id is accepted, and if not, fills it in
    const testCard = {
      frontText: 'test1-front',
      backText: 'test1-back',
      _id: '1',
    };
    const testCard2: FlashcardBase = {
      frontText: 'test2-front',
      backText: 'test2-back',
    };
    const initialValues: CreateAndConnectRoomOptions['initialValues'] = [
      testCard,
      testCard2,
    ];

    await db.createAndConnectRoom({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      name: 'Name_' + aliasSeed,
      topic: 'Topic_' + aliasSeed,
      initialValues,
    });

    const roomInDB = db.collections.flashcards[aliasSeed];
    expect(roomInDB).toBeDefined();
    const cards = roomInDB.ydoc?.getMap('documents').toJSON() as {
      [key: string]: Flashcard;
    };
    const cardIds = Object.keys(cards);
    expect(cardIds.length).toBe(2);
    expect(cardIds).toContain('1');
    expect(cards['1']._id).toEqual(testCard._id);
    expect(cards['1'].frontText).toEqual(testCard.frontText);
    expect(cards['1'].backText).toEqual(testCard.backText);
    const cardId2 = cardIds.find((id) => id !== '1');
    if (!cardId2) throw new Error('cardId2 undefined');
    expect(cardId2?.length).toBeGreaterThan(7); // random string
    expect(cards[cardId2].frontText).toEqual(testCard2.frontText);

    expect(eventListener).toHaveBeenCalled();
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('initialValues populated');
  });
});
