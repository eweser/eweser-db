import type { Database } from '../..';
import { checkServerConnection } from './checkServerConnection';

/** by default polls often (2000ms) trying to check for return of connection after connection loss, and less often (10000ms) checking to make sure connection is still there */
export const pollConnection = (
  db: Database,
  offlineInterval = 2000,
  onlineInterval = 10000
) => {
  if (db.isPolling) {
    db.info('Already polling connection');
    return;
  }
  db.isPolling = true;
  setInterval(() => {
    if (!db.online) {
      checkServerConnection(db);
    }
  }, offlineInterval);

  setInterval(() => {
    if (db.online) {
      checkServerConnection(db);
    }
  }, onlineInterval);
};
