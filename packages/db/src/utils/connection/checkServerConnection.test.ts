import { Database } from '../../';
import { pingServer } from './pingServer';
import type { MockedFunction } from 'vitest';
import { vitest, it, describe, expect, afterEach } from 'vitest';
import { checkServerConnection } from './checkServerConnection';
import { wait } from '../';

vitest.mock('./pingServer');
const emitListener = vitest.fn();

describe('checkServerConnection', () => {
  afterEach(() => {
    vitest.clearAllMocks();
  });

  it('should set the database online status to true when pingServer returns true', async () => {
    const db = new Database();
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;
    pingServerMock.mockResolvedValue(true);

    db.on('test', emitListener);

    checkServerConnection(db);

    await wait(50);

    // Assert
    expect(db.online).toBe(true);
    expect(emitListener).toHaveBeenCalledWith({
      event: 'onlineChange',
      data: { online: true },
      level: 'info',
    });
  });

  it('should set the database online status to false when pingServer returns false', async () => {
    const db = new Database();
    db.online = true;
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;
    pingServerMock.mockResolvedValue(false);
    db.on('test', emitListener);

    checkServerConnection(db);
    // Wait for 150ms (to ensure that the first poll has completed)
    await wait(50);

    // Assert
    expect(db.online).toBe(false);
    expect(emitListener).toHaveBeenCalledWith({
      event: 'onlineChange',
      data: { online: false },
      level: 'info',
    });
  });
});
