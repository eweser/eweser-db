import type { Database } from '..';
import type { DBEvent, DBEventEmitter } from '../types';

export const on = (_db: Database) => (listener: DBEventEmitter) => {
  _db.listeners.push(listener);
};

export const emit = (_db: Database) => (event: DBEvent) => {
  for (const listener of _db.listeners) {
    if (!event.level) event.level = 'info';
    listener(event);
  }
};
