import { describe, it, expect, beforeAll, afterEach, vitest } from 'vitest';

import { Database } from '..';
import type { IDatabase } from '..';
import {
  baseUrl,
  dummyUserName,
  dummyUserPass,
  HOMESERVER_NAME,
} from '../test-utils';
import { createMatrixUser } from '../test-utils/matrixTestUtil';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { loginToMatrix } from './login';

describe('connectRoom', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
    await createMatrixUser(dummyUserName, dummyUserPass);
  }, 60000);
  afterEach(() => {
    localStorage.clear();
  });

  it('Can log in to matrix client. Sets login info in localStorage. ', async () => {
    const DB = new Database({ baseUrl }) as IDatabase;
    const eventListener = vitest.fn();

    await loginToMatrix(DB, {
      userId: dummyUserName,
      password: dummyUserPass,
      baseUrl,
    });

    expect(DB.userId).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);
    const whoami = await DB.matrixClient?.whoami();
    expect(whoami?.user_id).toEqual(`@${dummyUserName}:${HOMESERVER_NAME}`);

    const loginInfo = JSON.parse(localStorage.getItem('loginData') || '{}');
    expect(loginInfo.password).toEqual(dummyUserPass);
  });
  it('DB.login() sets DB baseUrl to passed in baseURL, logs in to matrix client, connects registry. Sets loginStatus in db and `on` emitter', async () => {
    const DB = new Database() as IDatabase;
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

    const loginInfo = JSON.parse(localStorage.getItem('loginData') || '{}');
    expect(loginInfo.password).toEqual(dummyUserPass);

    //check registry
    const registryRoom = DB.collections.registry[0];
    expect(registryRoom.ydoc?.store).toBeDefined();
    expect(registryRoom.connectStatus).toEqual('ok');
    expect(registryRoom.matrixProvider?.roomId).toEqual(registryRoom.roomId);

    // login status and emitter
    expect(DB.loginStatus).toEqual('ok');
    const calls = eventListener.mock.calls;
    const statusUpdates = calls
      .filter((call) => !!call[0].loginStatus)
      .map((call) => call[0].loginStatus);

    expect(statusUpdates[0]).toEqual('loading');
    expect(statusUpdates[1]).toEqual('ok');
  });
  it('sets loginStatus, emits error, and returns null on failed login', () => {
    const DB = new Database() as IDatabase;
    const eventListener = vitest.fn();
    DB.baseUrl = 'something-else';
    expect(DB.baseUrl).toEqual('something-else');

    DB.on(eventListener);
    expect(DB.loginStatus).toEqual('initial');
    DB.login({
      userId: dummyUserName,
      password: dummyUserPass,
      baseUrl,
    }).catch((result) => {
      expect(result).toBe(null);
      expect(DB.loginStatus).toEqual('failed');
      expect(eventListener.mock.calls[1][0].message).toEqual(
        'error connecting registry'
      );
    });
  });
});
