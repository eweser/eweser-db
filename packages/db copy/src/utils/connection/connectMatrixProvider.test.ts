import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { Doc } from 'yjs';

import type { Flashcard } from '../../';
import { Database } from '../../';

import { CollectionKey } from '../../types';
import { baseUrl, testroomId, userLoginInfo } from '../../test-utils';
import { createMatrixUser } from '../../test-utils/matrixTestUtil';
import { loginToMatrix } from '../../methods/login';
import { connectMatrixProvider } from '.';
import { ensureMatrixIsRunning } from '../../test-utils/matrixTestUtilServer';
import { createTestRoomIfNotCreated } from '../../test-utils/matrixRoomManagement';
import { getOrSetRoom, wait } from '../../utils';
const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(userId, password);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('connectMatrixProvider', () => {
  it('Can connect to matrix provider', async () => {
    const db = new Database({ baseUrl });
    const doc = new Doc() as any;
    await loginToMatrix(db, loginInfo);
    if (!db.matrixClient) throw 'matrixClient not found';
    await createTestRoomIfNotCreated(db.matrixClient, userId);

    const room = getOrSetRoom(db)<Flashcard>('flashcards', testroomId);
    room.ydoc = doc;

    await connectMatrixProvider(db, room);

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
