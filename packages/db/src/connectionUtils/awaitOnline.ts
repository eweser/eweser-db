import type { Database } from '..';

/** Waits 3 seconds by default before failing */
export const awaitOnline = async (_db: Database, timeoutMs = 3000) => {
  if (_db.online) return true;

  return new Promise<boolean>((resolve) => {
    // eslint-disable-next-line prefer-const
    let timeout: NodeJS.Timeout;

    const listener = (event: any) => {
      if (event.event === 'onlineChange' && event.data.online === true) {
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
