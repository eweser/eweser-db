import type { Database } from '..';
import { createMatrixClient } from '../connectionUtils';
import { awaitOnline } from '../connectionUtils/awaitOnline';

import type { LoginData, LoginStatus, Documents, RegistryData } from '../types';
import type { TypedMap } from 'yjs-types';

/**
 *  Connects to Matrix client without loading registry
 *  Saves loginData to localStorage on success
 *  Saves userId to db
 */
export async function loginToMatrix(_db: Database, loginData: LoginData) {
  const { initialRoomConnect: _filterOut, ...options } = loginData;
  _db.matrixClient = await createMatrixClient(options);
  _db.userId = _db.matrixClient?.getUserId() || '';
  return _db.matrixClient;
}

const setLoginStatus = (_db: Database, loginStatus: LoginStatus) => {
  _db.loginStatus = loginStatus;
  _db.emit({
    event: 'loginStatus',
    data: { loginStatus },
  });
};

/**
 *
 * Connects to Matrix client and loads registry
 *
 * Saves loginData to localStorage on success
 */
export const login =
  (_db: Database) =>
  async (
    loginData: LoginData,
    fromSignup = false
  ): Promise<TypedMap<Documents<RegistryData>> | string> => {
    try {
      if (!fromSignup) setLoginStatus(_db, 'loading');

      const logger = (message: string, data?: any) =>
        _db.emit({
          event: 'login',
          message,
          data: { raw: data },
        });
      logger('starting login', loginData);
      _db.baseUrl = loginData.baseUrl;

      const online = await awaitOnline(_db);
      logger('starting login, online: ' + online, online);
      if (!online) {
        throw new Error('not online');
      }

      await loginToMatrix(_db, loginData);

      const connectRes = await _db.connectRegistry();

      if (loginData.initialRoomConnect) {
        await _db.createAndConnectRoom(loginData.initialRoomConnect);
      }

      logger('finished login', { connectRes });
      _db.emit({ event: 'started' });
      setLoginStatus(_db, 'ok');
      return connectRes;
    } catch (error: any) {
      const message = error?.message;
      _db.emit({
        event: 'login',
        message,
        data: { raw: error },
        level: 'error',
      });
      setLoginStatus(_db, 'failed');
      _db.emit({ event: 'startFailed', message });
      return message;
    }
  };
