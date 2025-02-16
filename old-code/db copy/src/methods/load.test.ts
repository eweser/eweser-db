import { describe, it, expect, beforeEach, vitest } from 'vitest';
import { awaitOnline, initializeDocAndLocalProvider } from '../utils';
import type { LoginData } from '..';
import { randomString } from '../utils';
import { CollectionKey, Database } from '..';
import 'fake-indexeddb';
import { baseUrl } from '../test-utils';
import {
  LocalStorageKey,
  localStorageSet,
} from '../utils/db/localStorageService';

const randomUsername = randomString(8);
const randomPassword = randomString(8);

describe('load', () => {
  let db: Database;
  const rooms = [
    { collectionKey: 'notes', roomId: 'foo' },
    { collectionKey: 'notes', roomId: 'bar' },
  ];

  const loginInfo: LoginData = {
    userId: randomUsername,
    baseUrl,
    password: randomPassword,
  };
  const listenerMock = vitest.fn();
  // const request = indexedDB.open('registry', 1);
  const loginMock = vitest.fn();
  const connectRoomMock = vitest.fn();
  beforeEach(async () => {
    db = new Database({ baseUrl });
    db.login = loginMock;
    db.connectRoom = connectRoomMock;
    listenerMock.mockReset();
    db.emit = listenerMock;
  });

  it('should return false if loginData is not in localStorage', async () => {
    localStorageSet(LocalStorageKey.loginData, null);
    expect(await db.load(rooms)).toBe(false);
    expect(listenerMock).toHaveBeenCalledWith({
      event: 'load',
      message: 'starting load',
      data: {
        raw: { rooms },
      },
    });
    expect(listenerMock).toHaveBeenCalledWith({
      event: 'load',
      message: 'unable to load localStore loginInfo',
      data: { raw: { rooms } },
    });
    const startFailedCall = listenerMock.mock.calls.find(
      (call) => call[0].event === 'startFailed'
    );
    expect(startFailedCall[0]).toEqual({
      event: 'startFailed',
      level: 'error',
      message: 'unable to load localStore loginInfo',
    });
  });

  it('should load registry and rooms from localStorage and indexedDB if available', async () => {
    await initializeDocAndLocalProvider('registry');
    localStorageSet(LocalStorageKey.loginData, loginInfo);

    await awaitOnline(db);
    const res = await db.load(rooms);

    const emitterCalls = listenerMock.mock.calls
      .filter((call) => call[0].event === 'load')
      .map((call) => call[0].message);
    expect(emitterCalls[0]).toEqual('starting load');
    expect(emitterCalls[1]).toEqual('loading from localStorage');
    expect(emitterCalls[2]).toEqual('loaded from localStorage');
    expect(emitterCalls[3]).toEqual('load, online: true');
    expect(loginMock).toHaveBeenCalled();
    expect(emitterCalls[4]).toEqual('load, login success');
    expect(connectRoomMock).toHaveBeenCalledTimes(2);
    expect(emitterCalls[7]).toEqual('load, connected rooms: 0/2');

    const startedCall = listenerMock.mock.calls.find(
      (call) => call[0].event === 'started'
    );
    expect(startedCall).toBeDefined();

    expect(res).toBe(true);
  }, 10000);
});
