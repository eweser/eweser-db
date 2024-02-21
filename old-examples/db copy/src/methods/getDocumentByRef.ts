import type { Database, Document } from '..';
import { wait, getRoomDocuments, parseRef } from '../utils';

export const getDocumentByRef =
  (db: Database) =>
  async <T extends Document>(ref: string): Promise<T> => {
    // validate the string is a valid ref
    const { collectionKey, roomId, documentId } = parseRef(ref);
    // load the local room that has the ref and return the document from it
    return new Promise((resolve, reject) => {
      const returnEarlyIfDocExists = async () => {
        const room = await db.loadAndConnectRoom<T>(
          { collectionKey, roomId },
          (room) => {
            if (!room) return reject('room not found');
            const document = getRoomDocuments(room).get(documentId);
            if (document) {
              resolve(document);
            }
          }
        );
        if (!room) return reject('room not found');
        let document = getRoomDocuments(room).get(documentId);
        if (!document) {
          // wait a few seconds for the room to sync
          await wait(2000);
          document = getRoomDocuments(room).get(documentId);
          if (!document) return reject('document not found');
        }
        resolve(document);
      };
      returnEarlyIfDocExists().catch(() => {
        reject('document not found');
      });
    });
  };
