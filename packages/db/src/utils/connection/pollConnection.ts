import type { Database } from '../../';
import { checkServerConnection } from './checkServerConnection';

/** by default polls often (2000ms) trying to check for return of connection after connection loss, and less often (10000ms) checking to make sure connection is still there */
export const pollConnection = (
  _db: Database,
  offlineInterval = 2000,
  onlineInterval = 10000
) => {
  setInterval(() => {
    if (!_db.online) checkServerConnection(_db);
  }, offlineInterval);

  setInterval(() => {
    if (_db.online) checkServerConnection(_db);
  }, onlineInterval);
};
