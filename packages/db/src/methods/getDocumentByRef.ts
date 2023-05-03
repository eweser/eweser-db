import type { Database, Document } from '..';
import { getRoomDocuments } from '..';
import { parseRef } from '../utils/db/parseRef';

export const getDocumentByRef =
  (db: Database) =>
  async <T extends Document>(ref: string): Promise<T> => {
    // validate the string is a valid ref
    const { collectionKey, aliasSeed, documentId } = parseRef(ref);
    // load the local room that has the ref and return the document from it
    return new Promise((resolve, reject) => {
      // if the room is not connected to remote, it will async connect it
      db.loadAndConnectRoom<T>({ collectionKey, aliasSeed }, (room) => {
        if (!room) return reject('room not found');
        const document = getRoomDocuments(room).get(documentId);
        if (!document) return reject('document not found');
        resolve(document);
      });
    });
  };
