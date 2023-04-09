import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';

import type { LoginData } from '..';
import { CollectionKey, Database } from '..';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  HOMESERVER_NAME,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { loginToMatrix } from './login';
import { localStorageGet, LocalStorageKey } from '../utils/localStorageService';

describe('db.login()', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
    await createMatrixUser(dummyUserName, dummyUserPass);
  }, 60000);
  afterEach(() => {
    localStorage.clear();
  });
  it('Can log in to matrix client. Sets login info in localStorage. ', async () => {
    const DB = new Database({ baseUrl });

    await loginToMatrix(DB, {
      userId: dummyUserName,
      password: dummyUserPass,
      baseUrl,
    });

    expect(DB.userId).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);
    const whoami = await DB.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);

    const loginInfo = localStorageGet<LoginData>(LocalStorageKey.loginData);
    expect(loginInfo?.password).toEqual(dummyUserPass);
  });

  it('returns "not online" error if offline', async () => {
    const DB = new Database();
    const eventListener = vitest.fn();
    DB.on(eventListener);

    const result = await DB.login({
      userId: dummyUserName,
      password: dummyUserPass,
      baseUrl: 'http://localhost:123',
    });
    expect(result).toBe('not online');
    expect(DB.loginStatus).toEqual('failed');
    expect(eventListener.mock.calls[2][0].message).toEqual(
      'starting login, online: false'
    );
  });

  it('DB.login() sets DB baseUrl to passed in baseURL, logs in to matrix client, connects registry. Sets loginStatus in db and `on` emitter', async () => {
    const DB = new Database();
    const eventListener = vitest.fn();
    DB.baseUrl = 'something-else';
    expect(DB.baseUrl).toEqual('something-else');

    DB.on(eventListener);
    expect(DB.loginStatus).toEqual('initial');
    await DB.login({
      userId: dummyUserName,
      password: dummyUserPass,
      baseUrl,
    });
    expect(DB.baseUrl).toEqual(baseUrl);

    // as above
    expect(DB.userId).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);
    const whoami = await DB.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);

    const loginInfo = localStorageGet<LoginData>(LocalStorageKey.loginData);
    expect(loginInfo?.password).toEqual(dummyUserPass);

    //check registry
    const registryRoom = DB.collections.registry[0];
    expect(registryRoom.ydoc?.store).toBeDefined();
    expect(registryRoom.connectStatus).toEqual('ok');
    expect(registryRoom.matrixProvider?.roomId).toEqual(registryRoom.roomId);

    // login status and emitter
    expect(DB.loginStatus).toEqual('ok');
    const calls = eventListener.mock.calls;
    const statusUpdates = calls
      .filter((call) => !!call[0].data?.loginStatus)
      .map((call) => call[0].data.loginStatus);

    expect(statusUpdates[0]).toEqual('loading');
    expect(statusUpdates[1]).toEqual('ok');
  }, 10000);
  it('connects to a provided room if called with initialRoomConnect', async () => {
    const userId = 'test-user' + Math.random().toString(36).substring(7);
    const password = 'test-pass' + Math.random().toString(36).substring(7);
    const signupDB = new Database();
    await signupDB.signup({
      userId,
      password,
      baseUrl,
    });

    const DB = new Database();
    const eventListener = vitest.fn();

    DB.on(eventListener);
    expect(DB.loginStatus).toEqual('initial');
    await DB.login({
      userId,
      password,
      baseUrl,
      initialRoomConnect: {
        aliasSeed: 'test-room' + Math.random().toFixed(),
        collectionKey: CollectionKey.flashcards,
      },
    });
    const callMessages = eventListener.mock.calls.map(
      (call) => call[0].message
    );
    // console.log(callMessages); // this is a really nice way to see all the events in order
    expect(callMessages).toContain('starting createAndConnectRoom');
    expect(callMessages).toContain('matrix provider connected');
  }, 60000);
});
