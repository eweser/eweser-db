import type { Database } from '..';
import type { DBEvent, DBEventEmitter } from '../types';

export const on =
  (_db: Database) => (label: string, listener: DBEventEmitter) => {
    _db.listeners[label || 'default'] = listener;
  };

export const emit = (_db: Database) => (event: DBEvent) => {
  for (const listener of Object.values(_db.listeners)) {
    if (!event.level) event.level = 'info';
    listener(event);
  }
};

export const off = (_db: Database) => (label: string) => {
  delete _db.listeners[label || 'default'];
};
