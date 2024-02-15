import { describe, it, expect, vitest, beforeAll } from 'vitest';
import { Database } from '..';
import { CollectionKey } from '../types';
import { baseUrl } from '../test-utils';
import { ensureMatrixIsRunning } from '../test-utils/matrixTestUtilServer';
import { randomString } from '../';
describe('addTempDocToRoom', () => {
  beforeAll(async () => {
    await ensureMatrixIsRunning();
  }, 60000);
  it('adds a yjs doc and matrix provider to a `tempDocs` object within the room object. initializes the provider', async () => {
    try {
      const db = new Database();
      const listener = vitest.fn();
      db.on('test', listener);
      const roomId = 'test' + randomString(8);

      await db.signup({
        userId: randomString(8),
        password: randomString(8),
        baseUrl,
        initialRoomConnect: {
          roomId,
          collectionKey: 'flashcards',
        },
      });

      const room = await db.collections['flashcards'][roomId];

      const docRef = 'testRef';
      const doc = await db.addTempDocToRoom(room, docRef);

      expect(doc?.store).toBeDefined();
      const tempDoc = room.tempDocs[docRef];
      expect(tempDoc.doc.store).toBeDefined();
      expect(tempDoc.matrixProvider?.matrixReader).toBeDefined();

      await tempDoc.matrixProvider?.initialize();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      expect(error.message).toEqual('already initialized reader');
    }
  });
});
