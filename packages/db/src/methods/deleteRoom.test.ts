import { afterEach, beforeAll, describe, expect, it, vitest } from 'vitest';
import {
  CollectionKey,
  Database,
  buildAliasFromSeed,
  getRegistry,
  newDocument,
  randomString,
} from '..';
import { baseUrl, populateTestRegistry, userLoginInfo } from '../test-utils';
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
describe('deleteRoom', () => {
  it('should leave the matrix room, delete registry entry and collection', async () => {
    const db = new Database({ debug: true, baseUrl });
    await db.login(loginInfo);
    await populateTestRegistry(db);
    const registry = getRegistry(db);

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
    if (!resRoom.roomId) throw new Error('roomId undefined');
    const roomInDB = db.collections.flashcards[aliasSeed];
    expect(roomInDB).toBeDefined();
    expect(roomInDB.roomAlias).toEqual(roomAlias);
    const joinedRoomsBefore = await db.matrixClient?.getJoinedRooms();

    expect(joinedRoomsBefore).toBeDefined();
    expect(
      joinedRoomsBefore?.joined_rooms.includes(resRoom.roomId)
    ).toBeTruthy();
    const registryDataBefore = registry.get('0');

    expect(registryDataBefore?.flashcards[aliasSeed]).not.toBeUndefined();

    expect(db.collections.flashcards[aliasSeed]).not.toBeUndefined();

    await db.deleteRoom({ aliasSeed, collectionKey: CollectionKey.flashcards });

    // room has been left
    const joinedRooms = await db.matrixClient?.getJoinedRooms();

    expect(joinedRooms).toBeDefined();
    expect(joinedRooms?.joined_rooms.includes(resRoom.roomId)).toBeFalsy();
    const registryData = registry.get('0');

    // registry entry has been deleted
    expect(registryData?.flashcards[roomAlias]).toBeUndefined();

    // collection has been deleted
    expect(db.collections.flashcards[aliasSeed]).toBeUndefined();
  });
});
