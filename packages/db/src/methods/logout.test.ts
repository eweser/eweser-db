import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { Database } from '..';
import { baseUrl, localWebRtcServer, userLoginInfo } from '../test-utils';
import type { LoginData } from '../types';
import { CollectionKey } from '../types';
const loginInfo = userLoginInfo();

import { checkMatrixProviderConnected, randomString } from '../utils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import {
  localStorageGet,
  LocalStorageKey,
} from '../utils/db/localStorageService';

beforeAll(async () => {
  await ensureMatrixIsRunning();
}, 60000);
afterEach(() => {
  localStorage.clear();
});
describe('logout', () => {
  it('disconnects all collection rooms and wipes localStorage', async () => {
    const db = new Database({
      baseUrl,
      webRTCPeers: [localWebRtcServer],
      // debug: true,
    });
    await db.signup(loginInfo);
    const aliasSeed = 'test' + randomString(12);
    const collectionKey = CollectionKey.flashcards;
    const resRoom = await db.createAndConnectRoom({
      aliasSeed,
      collectionKey,
    });
    expect(resRoom).toBeDefined();
    if (typeof resRoom === 'string') throw new Error('failed to connect');
    expect(resRoom?.ydoc?.store).toBeDefined();
    expect(checkMatrixProviderConnected(resRoom?.matrixProvider)).toBe(true);
    const dbRoom = db.getRoom({ collectionKey, aliasSeed });
    expect(checkMatrixProviderConnected(dbRoom?.matrixProvider)).toBe(true);

    const localLoginInfo = localStorageGet<LoginData>(
      LocalStorageKey.loginData
    );
    expect(localLoginInfo?.password).toEqual(loginInfo.password);

    await db.logout();
    const dbRoomAfter = db.getRoom({ collectionKey, aliasSeed });
    expect(checkMatrixProviderConnected(dbRoomAfter?.matrixProvider)).toBe(
      false
    );

    const localLoginInfoAfter = localStorageGet<LoginData>(
      LocalStorageKey.loginData
    );
    expect(localLoginInfoAfter).toBeFalsy();
  }, 60000);
});
