import { describe, it, expect, beforeEach } from 'vitest';
import { loadRoom } from './loadRoom';
import { CollectionKey, Database } from '..';

describe('loadRoom', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database();
  });

  it('should load a room and return it', async () => {
    db.userId = 'testUserId';
    const collectionKey = CollectionKey.notes;
    const aliasSeed = 'testAliasSeed';
    const room = await loadRoom(db, { collectionKey, aliasSeed });
    expect(room).toBeDefined();
    expect(room.ydoc?.store).toBeDefined();
  });

  it('should load the registry and return it', async () => {
    const collectionKey = 'registry';
    const aliasSeed = '';
    const room = await loadRoom(db, { collectionKey, aliasSeed });
    expect(room).toBeDefined();
    expect(room.ydoc?.store).toBeDefined();
  });
});
