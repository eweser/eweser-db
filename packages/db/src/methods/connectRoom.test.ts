import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';

import { randomString, wait } from '..';
import { CollectionKey, Database, buildAliasFromSeed } from '..';
import { checkMatrixProviderConnected, checkWebRtcConnection } from '../utils';
import { baseUrl, localWebRtcServer, userLoginInfo } from '../test-utils';

import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
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
  * 7. Sets up a listener for if going from offline to online, and then re-connects the room
  * 8. Sets up a listener for if going from online to offline, and then disconnects the room  * `, async () => {
    const db1 = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
    });

    const aliasSeed = 'test' + randomString(12);

    await db1.signup({
      ...loginInfo,
      initialRoomConnect: {
        aliasSeed,
        collectionKey: CollectionKey.flashcards,
      },
    });

    const roomAlias = buildAliasFromSeed(
      aliasSeed,
      CollectionKey.flashcards,
      db1.userId
    );

    const db = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
    });
    await db.login(loginInfo);

    const eventListener = vitest.fn();
    db.on('test', eventListener);

    const resRoom = await db.connectRoom({
      aliasSeed,
      collectionKey: CollectionKey.flashcards,
      waitForWebRTC: true,
    });

    expect(resRoom).toBeDefined();
    if (typeof resRoom === 'string') throw new Error('failed to connect');
    expect(resRoom?.roomAlias).toEqual(roomAlias);
    expect(resRoom?.ydoc?.store).toBeDefined();
    expect(checkMatrixProviderConnected(resRoom?.matrixProvider)).toBe(true);
    expect(checkWebRtcConnection(resRoom.webRtcProvider)).toBe(true);

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
    // disconnects on change to offline

    db.emit({ event: 'onlineChange', data: { online: false } });

    expect(roomInDB.connectStatus).toEqual('disconnected');
    expect(checkMatrixProviderConnected(resRoom?.matrixProvider)).toBe(false);
    expect(checkWebRtcConnection(resRoom.webRtcProvider)).toBe(false);

    // reconnects on change to online
    db.emit({ event: 'onlineChange', data: { online: true } });

    await wait(3000);
    const roomReconnected = db.collections.flashcards[aliasSeed];
    expect(roomReconnected.connectStatus).toEqual('ok');
    expect(checkMatrixProviderConnected(roomReconnected?.matrixProvider)).toBe(
      true
    );

    expect(checkWebRtcConnection(roomReconnected.webRtcProvider)).toBe(true);
  }, 15000);
});
