import { Database } from '..';
import { pingServer } from './pingServer';
import type { MockedFunction } from 'vitest';
import { vitest, it, describe, expect, afterEach } from 'vitest';
import { pollConnection } from './pollConnection';

vitest.mock('./pingServer');
const emitListener = vitest.fn();

describe('pollConnection', () => {
  afterEach(() => {
    vitest.clearAllMocks();
  });

  it('should set the database online status to true when pingServer returns true', async () => {
    const db = new Database();
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;
    pingServerMock.mockResolvedValueOnce(true);

    db.on(emitListener);

    pollConnection(db, 100);

    // Wait for 150ms (to ensure that the first poll has completed)
    await new Promise((resolve) => setTimeout(resolve, 150));

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

    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;
    pingServerMock.mockResolvedValueOnce(false);
    db.on(emitListener);

    pollConnection(db, 100);
    // Wait for 150ms (to ensure that the first poll has completed)
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Assert
    expect(db.online).toBe(false);
    expect(emitListener).toHaveBeenCalledWith({
      event: 'onlineChange',
      data: { online: false },
      level: 'info',
    });
  });

  it('should call pingServer with the database instance', async () => {
    const db = new Database();
    // Arrange
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;

    // Act
    pollConnection(db, 100);

    // Wait for 150ms (to ensure that the first poll has completed)
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Assert
    expect(pingServerMock).toHaveBeenCalledWith(db);
  });

  it('should poll the server at the specified interval', async () => {
    const db = new Database();
    // Arrange
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;

    // Act
    pollConnection(db, 100);

    // Wait for 250ms (to ensure that the second poll has completed)
    await new Promise((resolve) => setTimeout(resolve, 250));

    // Assert
    expect(pingServerMock.mock.calls.length).toBeGreaterThan(8);
  });
});
