import { describe, it, expect } from 'vitest';

import { Database, randomString } from '..';
import { CollectionKey } from '../types';

describe('createOfflineRoom', () => {
  it('should create a room', async () => {
    const aliasSeed = 'test' + randomString(12);
    const collectionKey = CollectionKey.flashcards;
    const db = new Database({ offlineOnly: true });
    const room = await db.createOfflineRoom({ aliasSeed, collectionKey });
    expect(room?.roomAlias).toEqual(
      `#${aliasSeed}~${collectionKey}~${db.userId}`
    );
    expect(room?.ydoc).toBeDefined();
  });
});
