import { describe, it, expect, beforeEach } from 'vitest';

import { CollectionKey, Database } from '../../';

describe('loadRoom', () => {
  let db: Database;

  beforeEach(() => {
    db = new Database();
  });

  it('should load a room and return it', async () => {
    db.userId = 'testUserId';
    const collectionKey = 'notes';
    const roomId = 'testroomId';
    const room = await db.loadRoom({ collectionKey, roomId });
    expect(room).toBeDefined();
    expect(room.ydoc?.store).toBeDefined();
  });

  it('should load the registry and return it', async () => {
    const collectionKey = 'registry';
    const roomId = '';
    const room = await db.loadRoom({ collectionKey, roomId });
    expect(room).toBeDefined();
    expect(room.ydoc?.store).toBeDefined();
  });
});
