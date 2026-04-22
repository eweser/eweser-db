import type { Database } from '../index.js';
import type { DatabaseEvents } from '../events.js';

export const log: (db: Database) => DatabaseEvents['log'] =
  (db) =>
  (level, ...message) => {
    if (level >= db.logLevel) {
      db.emit('log', level, ...message);
    }
  };
