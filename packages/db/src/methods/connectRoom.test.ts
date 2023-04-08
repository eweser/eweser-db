import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';

import { getRegistry, newDocument } from '..';
import { CollectionKey, Database, buildAliasFromSeed } from '..';
import { createRoom, getAliasNameFromAlias } from '../connectionUtils';
import { loginToMatrix } from './login';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  userLoginInfo,
} from '../test-utils';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { RegistryData } from '../types';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('connectRoom', () => {
  it(` * 1. Joins the Matrix room if not in it
  * 2. Creates a Y.Doc and saves it to the room object
  * 3. Creates a matrixCRDT provider and saves it to the room object
  * 4. Save the room's metadata to the registry`, async () => {
    const DB = new Database({ baseUrl });
    await loginToMatrix(DB, userLoginInfo);
    await DB.connectRegistry();
    const registry = getRegistry(DB);

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
    const seed = 'test' + (Math.random() * 10000).toFixed();
    const roomAlias = buildAliasFromSeed(
      seed,
      CollectionKey.flashcards,
      DB.userId
    );

    const room = await createRoom(DB.matrixClient, {
      roomAliasName: getAliasNameFromAlias(roomAlias),
      name: 'Test Room',
      topic: 'This is a test room',
    });

    updateRegistryEntry(DB, {
      collectionKey: CollectionKey.flashcards,
      aliasSeed: seed,
      roomId: room.room_id,
    });

    const eventListener = vitest.fn();
    DB.on(eventListener);

    const resRoom = await DB.connectRoom(seed, CollectionKey.flashcards);

    expect(resRoom).toBeDefined();
    expect(resRoom?.ydoc).toBeDefined();
    expect(resRoom?.matrixProvider).toBeDefined();

    const roomInDB = DB.collections.flashcards[seed];
    expect(roomInDB).toBeDefined();
    expect(roomInDB.roomAlias).toEqual(roomAlias);

    expect(eventListener).toHaveBeenCalled();
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('starting connectRoom');
    expect(callMessages).toContain('room joined');
    expect(callMessages).toContain('ydoc created');
    expect(callMessages).toContain('registry updated');
    expect(callMessages).toContain('matrix provider connected');
  }, 10000);
});
