import { Database } from '..';
import { pingServer } from './pingServer';

export const pollConnection = (_db: Database, interval = 1000) => {
  setInterval(async () => {
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
  }, interval);
};
