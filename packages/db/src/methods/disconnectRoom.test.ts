import { describe, it, expect, vitest, afterEach, beforeAll } from 'vitest';
import {
  CollectionKey,
  Database,
  autoReconnectListenerName,
  buildAliasFromSeed,
  checkMatrixProviderConnected,
  checkWebRtcConnection,
  createRoom,
  getAliasNameFromAlias,
  getRegistry,
  newDocument,
  randomString,
  updateRegistryEntry,
  wait,
} from '..';
import { baseUrl, localWebRtcServer, userLoginInfo } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import type { RegistryData } from '../types';

const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});
describe('disconnectRoom', () => {
  it('calls disconnect on all providers and removes autoReconnect listener', async () => {
    const db = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
    });

    await db.login(loginInfo);
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
    if (typeof resRoom === 'string') throw new Error('resRoom undefined');
    expect(resRoom?.roomAlias).toEqual(roomAlias);
    expect(resRoom?.ydoc?.store).toBeDefined();
    expect(checkMatrixProviderConnected(resRoom?.matrixProvider)).toBe(true);
    expect(checkWebRtcConnection(resRoom.webRtcProvider)).toBe(true);
    const listeners = Object.keys(db.listeners);
    const reconnectListener = autoReconnectListenerName(resRoom.roomAlias);
    expect(listeners.includes(reconnectListener)).toBe(true);

    db.disconnectRoom({
      collectionKey: CollectionKey.flashcards,
      aliasSeed,
    });

    await wait(1000);
    // calls resRoom event
    const calls = eventListener.mock.calls;
    const callMessages = calls.map((call) => call[0].message);
    expect(callMessages).toContain('disconnecting room');
    //@ts-expect-error //private value
    expect(resRoom.matrixProvider?.disposed).toBe(true);

    expect(checkWebRtcConnection(resRoom.webRtcProvider)).toBe(false);
    expect(checkMatrixProviderConnected(resRoom?.matrixProvider)).toBe(false);

    // removes reconnectListener
    const listenersAfter = Object.keys(db.listeners);
    expect(listenersAfter.includes(reconnectListener)).toBe(false);
  });
}, 20000);
