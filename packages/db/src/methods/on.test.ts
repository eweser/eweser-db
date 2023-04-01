import { describe, it, expect, vitest } from 'vitest';
import { Database } from '..';

describe('on', () => {
  it('should allow user to register listeners which emit events', () => {
    const DB = new Database();
    const listener = vitest.fn();
    DB.on(listener);
    DB.emit({ event: 'test', type: 'login' });
    expect(listener).toBeCalledTimes(1);
    expect(listener).toBeCalledWith({ event: 'test', type: 'login' });

    // can add another listener, can add data
    const listener2 = vitest.fn();
    DB.on(listener2);
    DB.emit({ event: 'test2', type: 'login', data: { id: '123' } });
    expect(listener).toBeCalledTimes(2);

    expect(listener2).toBeCalledTimes(1);
    expect(listener2).toBeCalledWith({
      event: 'test2',
      type: 'login',
      data: {
        id: '123',
      },
    });
  });
});
