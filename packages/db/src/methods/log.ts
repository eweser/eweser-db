import type { Database } from '..';
import type { DatabaseEvents } from '../events';

export const log: (db: Database) => DatabaseEvents['log'] =
  (db) =>
  (level, ...message) => {
    if (level >= db.logLevel) {
      db.emit('log', level, ...message);
    }
  };
