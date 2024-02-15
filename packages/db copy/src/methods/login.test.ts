import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';

import type { LoginData } from '..';
import { randomString } from '../utils';
import { CollectionKey, Database } from '..';
import { baseUrl, HOMESERVER_NAME, userLoginInfo } from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { loginToMatrix } from './login';
import {
  localStorageGet,
  LocalStorageKey,
} from '../utils/db/localStorageService';
const loginInfo = userLoginInfo();
const { userId, password } = loginInfo;
describe('db.login()', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
    await createMatrixUser(userId, password);
  }, 60000);
  afterEach(() => {
    localStorage.clear();
  });
  it('Can log in to matrix client. Sets login info in localStorage. ', async () => {
    const db = new Database({ baseUrl });

    await loginToMatrix(db, {
      userId,
      password,
      baseUrl,
    });

    expect(db.userId).toEqual(`@${userId}:${HOMESERVER_NAME}`);
    const whoami = await db.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${userId}:${HOMESERVER_NAME}`);

    const loginInfo = localStorageGet<LoginData>(LocalStorageKey.loginData);
    expect(loginInfo?.password).toEqual(password);
  });

  it('returns "not online" error if offline', async () => {
    const db = new Database();
    const eventListener = vitest.fn();
    db.on('test', eventListener);

    const result = await db.login({
      userId,
      password,
      baseUrl: 'http://localhost:123',
    });
    expect(result).toBe('not online');
    expect(db.loginStatus).toEqual('failed');
    expect(eventListener.mock.calls[2][0].message).toEqual(
      'starting login, online: false'
    );
    const startFailedCall = eventListener.mock.calls.find(
      (call) => call[0].event === 'startFailed'
    );
    expect(startFailedCall).toBeDefined();
  });

  it('DB.login() sets DB baseUrl to passed in baseURL, logs in to matrix client, connects registry. Sets loginStatus in db and `on` emitter', async () => {
    const db = new Database();
    const eventListener = vitest.fn();
    db.baseUrl = 'something-else';
    expect(db.baseUrl).toEqual('something-else');

    db.on('test', eventListener);
    expect(db.loginStatus).toEqual('initial');
    await db.login({
      userId,
      password,
      baseUrl,
    });
    expect(db.baseUrl).toEqual(baseUrl);

    // as above
    expect(db.userId).toEqual(`@${userId}:${HOMESERVER_NAME}`);
    const whoami = await db.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${userId}:${HOMESERVER_NAME}`);

    const loginInfo = localStorageGet<LoginData>(LocalStorageKey.loginData);
    expect(loginInfo?.password).toEqual(password);

    //check registry
    const registryRoom = db.collections.registry[0];
    expect(registryRoom.ydoc?.store).toBeDefined();
    expect(registryRoom.connectStatus).toEqual('ok');
    expect(registryRoom.matrixProvider?.roomId).toEqual(registryRoom.roomId);

    // login status and emitter
    expect(db.loginStatus).toEqual('ok');
    const calls = eventListener.mock.calls;
    const statusUpdates = calls
      .filter((call) => !!call[0].data?.loginStatus)
      .map((call) => call[0].data.loginStatus);

    expect(statusUpdates[0]).toEqual('loading');
    expect(statusUpdates[1]).toEqual('ok');
    const startedCall = eventListener.mock.calls.find(
      (call) => call[0].event === 'started'
    );
    expect(startedCall).toBeDefined();
  }, 10000);
  it('connects to a provided room if called with initialRoomConnect', async () => {
    const userId = 'test-user' + randomString(8);
    const password = 'test-pass' + randomString(8);
    const signupDB = new Database();
    await signupDB.signup({
      userId,
      password,
      baseUrl,
    });

    const db = new Database();
    const eventListener = vitest.fn();

    db.on('test', eventListener);
    expect(db.loginStatus).toEqual('initial');
    await db.login({
      userId,
      password,
      baseUrl,
      initialRoomConnect: {
        roomId: 'test-room' + randomString(8),
        collectionKey: 'flashcards',
      },
    });
    const callMessages = eventListener.mock.calls.map(
      (call) => call[0].message
    );
    // console.log(callMessages); // this is a really nice way to see all the events in order
    expect(callMessages).toContain('starting createAndConnectRoom');
    expect(callMessages).toContain('matrix provider connected');
    const startedCall = eventListener.mock.calls.find(
      (call) => call[0].event === 'started'
    );
    expect(startedCall).toBeDefined();
  }, 60000);
});
