import { describe, it, expect, vitest } from 'vitest';
import { Database } from '..';
import type { DBEvent } from '../types';

describe('on', () => {
  it('should allow user to register listeners which emit events', () => {
    const DB = new Database();
    const listener = vitest.fn();
    DB.on(listener);
    DB.emit({ event: 'login' });
    expect(listener).toBeCalledTimes(1);
    // sets default level to info
    expect(listener).toBeCalledWith({ event: 'login', level: 'info' });

    // can add another listener, can add data
    const listener2 = vitest.fn();
    DB.on(listener2);
    const event2: DBEvent = {
      event: 'login',
      level: 'warn',
      data: { id: '123' },
    };
    DB.emit(event2);
    expect(listener).toBeCalledTimes(2);

    expect(listener2).toBeCalledTimes(1);
    expect(listener2).toBeCalledWith(event2);
  });
});
