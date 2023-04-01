import type { DBEvent, DBEventEmitter, IDatabase } from '../types';

export function on(this: IDatabase, listener: DBEventEmitter) {
  this.listeners.push(listener);
}

export function emit(this: IDatabase, event: DBEvent) {
  for (const listener of this.listeners) {
    if (!event.level) event.level = 'info';
    listener(event);
  }
}
