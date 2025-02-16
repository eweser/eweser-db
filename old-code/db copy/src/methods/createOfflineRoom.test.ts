import { describe, it, expect } from 'vitest';

import { Database, randomString } from '..';
import { CollectionKey } from '../types';

describe('createOfflineRoom', () => {
  it('should create a room', async () => {
    const roomId = 'test' + randomString(12);
    const collectionKey = 'flashcards';
    const db = new Database({ offlineOnly: true });
    const room = await db.createOfflineRoom({ roomId, collectionKey });
    expect(room?.roomId).toEqual(`#${roomId}~${collectionKey}~${db.userId}`);
    expect(room?.ydoc).toBeDefined();
  });
});
