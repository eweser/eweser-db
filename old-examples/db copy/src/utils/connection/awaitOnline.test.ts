import { describe, it, expect } from 'vitest';
import { Database } from '../..';
import { awaitOnline } from './awaitOnline';
import { wait } from '..';

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
    await wait(100);
    db.emit({
      event: 'onlineChange',
      data: { online: true },
    }); // set the database to online
    const result = await promise; // wait for the promise to resolve
    expect(result).toBe(true);
  });
  it('should resolve to false if still false when the timeout expires', async () => {
    const db = new Database();
    db.online = false; // set the database to offline
    const promise = awaitOnline(db, 20);
    await wait(100);
    db.emit({
      event: 'onlineChange',
      data: { online: true },
    });
    db.online = true;
    // was set to true after the timeout expired
    const result = await promise;
    expect(result).toBe(false);
  });
});
