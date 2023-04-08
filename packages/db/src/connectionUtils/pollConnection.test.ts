import { Database } from '..';
import { pingServer } from './pingServer';
import {
  vitest,
  it,
  describe,
  expect,
  beforeEach,
  MockedFunction,
  afterEach,
} from 'vitest';
import { pollConnection } from './pollConnection';

vitest.mock('./pingServer');

describe('pollConnection', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database();
    db.online = true;
  });

  afterEach(() => {
    vitest.clearAllMocks();
  });

  it('should set the database online status to true when pingServer returns true', async () => {
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;
    pingServerMock.mockResolvedValueOnce(true);

    const emitListener = vitest.fn();
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
    const pingServerMock = pingServer as MockedFunction<typeof pingServer>;
    pingServerMock.mockResolvedValueOnce(false);
    const emitListener = vitest.fn();
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
