import { describe, it, expect, vitest, beforeAll } from 'vitest';
import { Database, randomString } from '..';
import { CollectionKey } from '../types';
import { baseUrl } from '../test-utils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';

describe('addTempDocToRoom', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
  }, 60000);
  it('adds a yjs doc and matrix provider to a `tempDocs` object within the room object. initializes the provider', async () => {
    const db = new Database();
    const listener = vitest.fn();
    db.on('test', listener);
    const seed = 'test' + randomString(8);

    await db.signup({
      userId: randomString(8),
      password: randomString(8),
      baseUrl,
      initialRoomConnect: {
        aliasSeed: seed,
        collectionKey: CollectionKey.flashcards,
      },
    });

    const room = await db.collections[CollectionKey.flashcards][seed];

    const docRef = 'testRef';
    const doc = await db.addTempDocToRoom(room, docRef);

    expect(doc?.store).toBeDefined();
    const tempDoc = room.tempDocs[docRef];
    expect(tempDoc.doc.store).toBeDefined();
    expect(tempDoc.matrixProvider?.matrixReader).toBeDefined();
    try {
      await tempDoc.matrixProvider?.initialize();
    } catch (error) {
      expect(error.message).toEqual('already initialized reader');
    }
  });
});
