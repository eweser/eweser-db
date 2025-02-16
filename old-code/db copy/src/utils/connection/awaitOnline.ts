import type { Database } from '../..';
import { checkServerConnection } from './checkServerConnection';

/** Waits 3 seconds by default before failing */
export const awaitOnline = async (_db: Database, timeoutMs = 5000) => {
  if (_db.online) return true;

  return new Promise<boolean>((resolve) => {
    // eslint-disable-next-line prefer-const
    let timeout: NodeJS.Timeout;

    const listener = (event: any) => {
      if (event.event === 'onlineChange' && event.data.online === true) {
        clearTimeout(timeout);
        _db.off('online-change');
        resolve(true);
      }
    };

    _db.on('online-change', listener);
    checkServerConnection(_db);
    timeout = setTimeout(() => {
      resolve(false);
    }, timeoutMs);
  });
};
