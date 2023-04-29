import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';

import { getRegistry, newDocument, randomString } from '..';
import { CollectionKey, Database, buildAliasFromSeed } from '..';
import { createRoom, getAliasNameFromAlias } from '../connectionUtils';
import { loginToMatrix } from './login';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  localWebRtcServer,
  userLoginInfo,
} from '../test-utils';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import type { RegistryData } from '../types';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('connectRoom', () => {
  it(` 
  * 1. Joins the Matrix room if not in it
  * 2. Creates a Y.Doc, syncs with localStorage (indexeddb) and saves it to the room object
  * 3. Creates a matrixCRDT provider and saves it to the room object
  * 4. Save the room's metadata to the registry (if not already there)
  * 5. saves teh room to the DB.collections, indexed by the aliasSeed, including the name of the collection
  * 6. Populates the ydoc with initial values if passed any
  * `, async () => {
    const db = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
    });
    await loginToMatrix(db, userLoginInfo);
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
    const aliasSeed = 'test' + randomString(12);
    const roomAlias = buildAliasFromSeed(
      aliasSeed,
      CollectionKey.flashcards,
      db.userId
    );

    const room = await createRoom(db.matrixClient, {
      roomAliasName: getAliasNameFromAlias(roomAlias),
      name: 'Test Room',
      topic: 'This is a test room',
    });

    updateRegistryEntry(db, {
      collectionKey: CollectionKey.flashcards,
      aliasSeed,
      roomId: room.room_id,
    });

    const eventListener = vitest.fn();
    db.on('test', eventListener);

    const resRoom = await db.connectRoom({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      waitForWebRTC: true,
    });

    expect(resRoom).toBeDefined();
    expect(resRoom?.roomAlias).toEqual(roomAlias);
    expect(resRoom?.ydoc?.store).toBeDefined();
    expect(resRoom?.matrixProvider?.canWrite).toBe(true);
    expect(resRoom?.webRtcProvider?.connected).toBe(true);

    const roomInDB = db.collections.flashcards[aliasSeed];
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
  }, 15000);
});
