import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';
import { Doc } from 'yjs';

import type { FlashCard } from '..';
import { buildRoomAlias, Database } from '..';
import type { IDatabase, Room } from '../types';
import { CollectionKey } from '../types';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  testRoomAlias,
  testRoomAliasSeed,
  userLoginInfo,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { loginToMatrix } from '../methods/login';
import {
  changeStatus,
  connectMatrixProvider,
  createRoom,
  getRoomId,
  newEmptyRoom,
} from '.';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { createTestRoomIfNotCreated } from '../test-utils/matrixRoomManagement';
import { wait } from '../utils';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('connectMatrixProvider', () => {
  it('Can connect to matrix provider', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    const doc = new Doc();
    await loginToMatrix(DB, userLoginInfo);
    if (!DB.matrixClient) throw 'matrixClient not found';
    const createdTestRoom = await createTestRoomIfNotCreated(DB.matrixClient);
    console.log({ createdTestRoom });
    DB.collections[CollectionKey.flashcards][testRoomAlias] =
      newEmptyRoom<FlashCard>(CollectionKey.flashcards, testRoomAlias);
    const room = DB.collections[CollectionKey.flashcards][testRoomAlias];
    room.doc = doc;

    const onStatusChange = vitest.fn();

    await connectMatrixProvider(
      DB,
      testRoomAlias,
      CollectionKey.flashcards,
      onStatusChange
    );

    expect(room.matrixProvider).toBeDefined();

    expect(onStatusChange).toHaveBeenCalledWith('loading');
    expect(onStatusChange).toHaveBeenCalledWith('ok');

    expect(room.connectStatus).toEqual('ok');

    expect(room.matrixProvider?.canWrite).toEqual(true);
    await wait(2500);

    // can close provider connection
    // try {
    //   room.matrixProvider?.dispose();
    // } catch (error) {
    //   console.log(error);
    // }
    // expect(onStatusChange).toHaveBeenCalledWith('disconnected');
    // expect(room.connectStatus).toEqual('disconnected');

    // expect(room.matrixProvider?.canWrite).toEqual(false);
    // room.matrixProvider = null;
  }, 30000);
});
