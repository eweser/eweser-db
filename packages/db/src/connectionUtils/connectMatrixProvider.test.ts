import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Doc } from 'yjs';

import type { FlashCard } from '..';
import { Database } from '..';

import { CollectionKey } from '../types';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  testRoomAlias,
  userLoginInfo,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { loginToMatrix } from '../methods/login';
import { connectMatrixProvider, newEmptyRoom } from '.';
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
    const DB = new Database({ baseUrl });
    const doc = new Doc() as any;
    await loginToMatrix(DB, userLoginInfo);
    if (!DB.matrixClient) throw 'matrixClient not found';
    await createTestRoomIfNotCreated(DB.matrixClient);

    const room = newEmptyRoom<FlashCard>(
      CollectionKey.flashcards,
      testRoomAlias
    );
    room.ydoc = doc;

    DB.collections[CollectionKey.flashcards][testRoomAlias] = room;

    await connectMatrixProvider(DB, room);

    expect(room.matrixProvider).toBeDefined();

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
