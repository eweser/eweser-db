import { Database } from '..';

/** Waits 3 seconds by default before failing */
export const awaitOnline = async (_db: Database, timeoutMs = 3000) => {
  if (_db.online) return true;

  return new Promise<boolean>((resolve) => {
    let timeout: NodeJS.Timeout;

    const listener = (event: any) => {
      if (event.event === 'onlineChange' && event.data.online) {
        clearTimeout(timeout);
        resolve(true);
      }
    };

    _db.on(listener);

    timeout = setTimeout(() => {
      resolve(false);
    }, timeoutMs);
  });
};
