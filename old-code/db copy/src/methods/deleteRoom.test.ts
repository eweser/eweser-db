import { afterEach, beforeAll, describe, expect, it, vitest } from 'vitest';
import {
  CollectionKey,
  Database,
  buildAliasFromSeed,
  getRegistry,
  randomString,
} from '..';
import { populateTestRegistry, userLoginInfo } from '../test-utils';
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
describe('deleteRoom', () => {
  it('should leave the matrix room, delete registry entry and collection', async () => {
    const db = new Database();
    await db.login(loginInfo);
    await populateTestRegistry(db);
    const registry = getRegistry(db);

    const roomId = 'test' + randomString(8);
    const roomId = buildAliasFromSeed(roomId, 'flashcards', db.userId);

    const eventListener = vitest.fn();
    db.on('test', eventListener);

    const resRoom = await db.createAndConnectRoom({
      roomId,
      collectionKey: 'flashcards',
      name: 'Name_' + roomId,
      topic: 'Topic_' + roomId,
    });
    if (!resRoom) throw new Error('resRoom undefined');

    expect(resRoom).toBeDefined();
    expect(resRoom.ydoc?.store).toBeDefined();
    expect(resRoom.matrixProvider).toBeDefined();
    if (!resRoom.roomId) throw new Error('roomId undefined');
    const roomInDB = db.collections.flashcards[roomId];
    expect(roomInDB).toBeDefined();
    expect(roomInDB.roomId).toEqual(roomId);
    const joinedRoomsBefore = await db.matrixClient?.getJoinedRooms();

    expect(joinedRoomsBefore).toBeDefined();
    expect(
      joinedRoomsBefore?.joined_rooms.includes(resRoom.roomId)
    ).toBeTruthy();
    const registryDataBefore = registry.get('0');

    expect(registryDataBefore?.flashcards[roomId]).not.toBeUndefined();

    expect(db.collections.flashcards[roomId]).not.toBeUndefined();

    await db.deleteRoom({ roomId, collectionKey: 'flashcards' });

    // room has been left
    const joinedRooms = await db.matrixClient?.getJoinedRooms();

    expect(joinedRooms).toBeDefined();
    expect(joinedRooms?.joined_rooms.includes(resRoom.roomId)).toBeFalsy();
    const registryData = registry.get('0');

    // registry entry has been deleted
    expect(registryData?.flashcards[roomId]).toBeUndefined();

    // collection has been deleted
    expect(db.collections.flashcards[roomId]).toBeUndefined();
  }, 30000);
});
