import type { Database } from '../..';
import { pingServer } from './pingServer';

/** pings the matrix server and sets the result to db.online. emits an event on change */
export const checkServerConnection = async (_db: Database) => {
  const res = await pingServer(_db);
  if (res) {
    if (_db.online) return;
    _db.online = true;
    _db.emit({
      event: 'onlineChange',
      data: { online: true },
    });
  } else {
    if (!_db.online) return;
    _db.online = false;
    _db.emit({
      event: 'onlineChange',
      data: { online: false },
    });
  }
};
