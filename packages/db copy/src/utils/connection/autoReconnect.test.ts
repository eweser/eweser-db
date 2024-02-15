import { describe, it, expect, vitest } from 'vitest';
import { autoReconnect } from './autoReconnect';
import { Database } from '../../';

describe('autoReconnect', () => {
  it('will call connect room with passed params when going from offline to online', () => {
    const listener = vitest.fn();
    const db = new Database();
    db.on('test_reconnectListener', listener);
    db.connectRoom = vitest.fn();
    const room = {
      roomId: 'testAlias',
    };
    const params = {
      testParam: 'test',
    };
    db.emit({ event: 'onlineChange', data: { online: true } });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(db.connectRoom).not.toHaveBeenCalled();

    autoReconnect(db, room as any, params as any);
    db.emit({ event: 'onlineChange', data: { online: false } });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(db.connectRoom).not.toHaveBeenCalled();

    db.emit({ event: 'onlineChange', data: { online: true } });
    expect(listener).toHaveBeenCalledTimes(4);
    const calls = listener.mock.calls.map((call) => call[0]);
    expect(calls[2]).toEqual({
      event: 'onlineChange',
      level: 'info',
      data: { online: true },
    });
    expect(calls[3]).toEqual({
      event: 'reconnectRoom',
      level: 'info',
      data: { roomId: 'testAlias' },
    });

    expect(db.connectRoom).toHaveBeenCalledWith(params);
  });
});
