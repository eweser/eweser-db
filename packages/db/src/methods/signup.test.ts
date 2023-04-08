import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';

import { Database } from '..';
import { baseUrl, HOMESERVER_NAME, dummyUserName } from '../test-utils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

const randomUsername = Math.random().toString(36).substring(7);
const randomPassword = Math.random().toString(36).substring(7);

describe('db.signup()', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
  }, 60000);
  afterEach(() => {
    localStorage.clear();
  });
  it('does not allow unvalidate usernames', async () => {
    const DB = new Database();
    const res1 = await DB.signup({
      userId: 'a',
      password: randomPassword,
      baseUrl,
    });
    expect(res1).toBe('username must be at least 3 characters long');
    const res2 = await DB.signup({
      userId: 'a'.repeat(53),
      password: randomPassword,
      baseUrl,
    });
    expect(res2).toBe('username must be less than 52 characters long');
    const res3 = await DB.signup({
      userId: 'a.123',
      password: randomPassword,
      baseUrl,
    });
    expect(res3).toBe('username cannot contain a period');
  });
  it('returns "user already exists" error if user already exists', async () => {
    const DB1 = new Database();

    try {
      await DB1.signup({
        userId: dummyUserName,
        password: randomPassword,
        baseUrl,
      });
      await DB1.matrixClient?.logout();
    } catch (e) {
      //
    }
    const DB = new Database();
    const eventListener = vitest.fn();
    DB.on(eventListener);
    const result = await DB.signup({
      userId: dummyUserName,
      password: randomPassword,
      baseUrl,
    });
    expect(DB.loginStatus).toEqual('failed');
    expect(result).toBe('user already exists');
  });
  it('returns "not online" error if offline', async () => {
    const DB = new Database();
    const eventListener = vitest.fn();
    DB.on(eventListener);

    const result = await DB.signup({
      userId: randomUsername,
      password: randomPassword,
      baseUrl: 'http://localhost:123',
    });
    expect(result).toBe('not online');
    expect(DB.loginStatus).toEqual('failed');
    expect(
      eventListener.mock.calls
        .map((call) => call[0].message)
        .includes('starting signup, online: false')
    ).toBe(true);
  });

  it('DB.signup() sets DB baseUrl to passed in baseURL, logs in to matrix client, connects registry. Sets loginStatus in db and `on` emitter', async () => {
    const DB = new Database();
    const eventListener = vitest.fn();
    DB.baseUrl = 'something-else';
    expect(DB.baseUrl).toEqual('something-else');

    DB.on(eventListener);
    expect(DB.loginStatus).toEqual('initial');
    await DB.signup({
      userId: randomUsername,
      password: randomPassword,
      baseUrl,
    });
    expect(DB.baseUrl).toEqual(baseUrl);

    // as above
    expect(DB.userId).toEqual(`@${randomUsername}:${HOMESERVER_NAME}`);
    const whoami = await DB.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${randomUsername}:${HOMESERVER_NAME}`);

    const loginInfo = JSON.parse(localStorage.getItem('loginData') || '{}');
    expect(loginInfo.password).toEqual(randomPassword);

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

    const signupStatusUpdates = calls
      .filter((call) => call[0].event === 'signup')
      .map((call) => call[0].message);
    expect(signupStatusUpdates).toEqual([
      'starting signup',
      'starting signup, online: true',
      'finished signup',
    ]);
  }, 10000);
});
