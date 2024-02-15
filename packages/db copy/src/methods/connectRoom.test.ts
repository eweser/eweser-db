import { describe, it, expect, vitest, beforeAll, afterEach } from 'vitest';

import { CollectionKey, Database } from '../../';
import {
  checkMatrixProviderConnected,
  checkWebRtcConnection,
  randomString,
  wait,
  buildAliasFromSeed,
} from '../utils';
import { baseUrl, localWebRtcServer, userLoginInfo } from '../test-utils';

import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

const loginInfo = userLoginInfo();

beforeAll(async () => {
  await ensureMatrixIsRunning();
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
  * 5. saves the room to the DB.collections, indexed by the roomId, including the name of the collection
  * 6. Populates the ydoc with initial values if passed any
  * 7. Sets up a listener for if going from offline to online, and then re-connects the room
  * 8. Sets up a listener for if going from online to offline, and then disconnects the room  * `, async () => {
    const db1 = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
    });

    const roomId = 'test' + randomString(12);

    const signupRes = await db1.signup({
      ...loginInfo,
      initialRoomConnect: {
        roomId,
        collectionKey: 'flashcards',
      },
    });
    if (typeof signupRes === 'string') {
      throw new Error('failed to signup: ' + signupRes);
    }

    const roomId = buildAliasFromSeed(roomId, 'flashcards', db1.userId);

    await db1.disconnectRoom({
      roomId,
      collectionKey: 'flashcards',
    });

    const db = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
      // debug: true,
    });
    await db.login(loginInfo);

    const eventListener = vitest.fn();
    db.on('test', eventListener);

    const resRoom = await db.connectRoom({
      roomId,
      collectionKey: 'flashcards',
      waitForWebRTC: true,
    });

    expect(resRoom).toBeDefined();
    if (typeof resRoom === 'string') throw new Error('failed to connect');
    expect(resRoom?.roomId).toEqual(roomId);
    expect(resRoom?.ydoc?.store).toBeDefined();
    expect(checkMatrixProviderConnected(resRoom?.matrixProvider)).toBe(true);
    expect(checkWebRtcConnection(resRoom.webRtcProvider)).toBe(true);

    const roomInDB = db.collections.flashcards[roomId];
    expect(roomInDB).toBeDefined();
    expect(roomInDB.roomId).toEqual(roomId);

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
    const roomReconnected = db.collections.flashcards[roomId];
    expect(roomReconnected.connectStatus).toEqual('ok');
    expect(checkMatrixProviderConnected(roomReconnected?.matrixProvider)).toBe(
      true
    );

    expect(checkWebRtcConnection(roomReconnected.webRtcProvider)).toBe(true);
  }, 15000);
});
