import type { Database } from '../..';

/** pings the matrix server and sets the result to db.online. emits an event on change */
export const checkServerConnection = async (db: Database) => {
  const success = await db.pingServer();
  if (success) {
    if (db.online) {
      return;
    }
    db.debug('Server is online');
    db.online = true;
    db.emit('onlineChange', true);
  } else {
    if (!db.online) {
      return;
    }
    db.error('Server is offline');
    db.online = false;
    db.emit('onlineChange', false);
  }
};
