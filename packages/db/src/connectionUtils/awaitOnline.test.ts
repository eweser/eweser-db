import { describe, it, expect } from 'vitest';
import { Database } from '..';
import { awaitOnline } from './awaitOnline';

describe('awaitOnline', () => {
  it('should return true if the database is already online', async () => {
    const db = new Database();
    db.online = true;
    const result = await awaitOnline(db);
    expect(result).toBe(true);
  });

  it('should resolve to true when the database comes online', async () => {
    const db = new Database();
    db.online = false; // set the database to offline
    const promise = awaitOnline(db); // call awaitOnline
    db.emit({
      event: 'onlineChange',
      data: { online: true },
    }); // set the database to online
    const result = await promise; // wait for the promise to resolve
    expect(result).toBe(true);
  });
  it('should resolve to false when the timeout expires', async () => {
    const db = new Database();
    db.online = false; // set the database to offline

    const promise = awaitOnline(db, 1000); // call awaitOnline with a timeout of 1 second
    const result = await promise; // wait for the promise to resolve
    expect(result).toBe(false);
  });
});
