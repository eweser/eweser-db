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
  });
});
