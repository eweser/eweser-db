import type { YMapEvent, Transaction } from 'yjs';
import type { Database } from '..';
import type { Document, DocumentWithoutBase, Room, Documents } from '../types';
import { randomString, buildRef, newDocument } from '../utils';

export const getDocuments =
  (_db: Database) =>
  <T extends Document>(room: Room<T>) => {
    if (!room) throw new Error('no room');
    const documents = room.ydoc?.getMap('documents');
    if (!documents) throw new Error('no documents');
    return {
      documents,
      get: (id: string) => {
        return documents.get(id);
      },
      set: (doc: T) => {
        doc._updated = Date.now();
        return documents.set(doc._id, doc);
      },
      new: (doc: DocumentWithoutBase<T>, id?: string) => {
        if (id && documents.get(id)) {
          throw new Error('document already exists');
        }
        let documentId = id || randomString(24);
        if (documents.get(documentId)) {
          documentId = randomString(24);
          if (documents.get(documentId)) {
            // twice failed to find a unique id
            throw new Error('document already exists');
          }
        }
        const ref = buildRef({
          authServer: _db.authServer,
          collectionKey: room.collectionKey,
          roomId: room.roomId,
          documentId,
        });
        const newDoc = newDocument(documentId, ref, doc);
        documents.set(documentId, newDoc);
        return newDoc;
      },
      delete: (id: string, timeToLiveMs?: number) => {
        const doc = documents.get(id);
        if (!doc) throw new Error('document does not exist');
        const oneMonth = 1000 * 60 * 60 * 24 * 30;
        doc._deleted = true;
        doc._ttl = timeToLiveMs ?? new Date().getTime() + oneMonth;
        return documents.set(id, doc);
      },
      getAll: () => {
        return documents.toJSON() as Documents<T>;
      },
      getUndeleted: () => {
        const undeleted: Documents<T> = {};
        documents.forEach((doc) => {
          if (doc && !doc._deleted) {
            undeleted[doc._id] = doc;
          }
        });
        return undeleted;
      },
      onChange: (
        callback: (event: YMapEvent<any>, transaction: Transaction) => void
      ) => {
        documents.observe(callback);
      },
      sortByRecent: (docs: Documents<T>): Documents<T> => {
        const sortedArray = Object.entries(docs).sort(
          (a, b) => b[1]._updated - a[1]._updated
        );
        return Object.fromEntries(sortedArray);
      },
    };
  };
