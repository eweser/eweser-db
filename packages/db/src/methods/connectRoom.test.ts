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
  userLoginInfo,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { loginToMatrix } from './login';
import {
  changeStatus,
  connectMatrixProvider,
  newEmptyRoom,
} from '../connectionUtils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

beforeAll(async () => {
  await ensureMatrixIsRunning();
  await createMatrixUser(dummyUserName, dummyUserPass);
}, 60000);
afterEach(() => {
  localStorage.clear();
});

describe('changeStatus', () => {
  it('Can change status', async () => {
    const mockRoom = { connectStatus: 'initial' } as Room<any>;
    const onStatusChange = vitest.fn();

    changeStatus(mockRoom, 'loading', onStatusChange);
    expect(mockRoom.connectStatus).toEqual('loading');
    expect(onStatusChange).toHaveBeenCalledWith('loading');
  });
});

describe('connectMatrixProvider', () => {
  it('Can connect to matrix provider', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    const doc = new Doc();
    await loginToMatrix(DB, userLoginInfo);
    const roomAlias = buildRoomAlias('test-room', DB.userId);
    DB.collections[CollectionKey.flashcards][roomAlias] =
      newEmptyRoom<FlashCard>(CollectionKey.flashcards, roomAlias);
    const room = DB.collections[CollectionKey.flashcards][roomAlias];
    room.doc = doc;

    const onStatusChange = vitest.fn();

    await connectMatrixProvider(
      DB,
      roomAlias,
      CollectionKey.flashcards,
      onStatusChange
    );
    expect(onStatusChange).toHaveBeenCalledWith('loading');
    expect(onStatusChange).toHaveBeenCalledWith('ok');

    expect(room.connectStatus).toEqual('connected');

    expect(room.matrixProvider).toBeDefined();
    expect(room.matrixProvider?.canWrite).toEqual(true);

    // can destroy the provider

    // room.matrixProvider?.dispose();
    // expect(onStatusChange).toHaveBeenCalledWith('disconnected');

    // expect(room.matrixProvider?.canWrite).toEqual(false);
    // room.matrixProvider = null;
  }, 30000);
});
