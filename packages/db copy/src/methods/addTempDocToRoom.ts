import { IndexeddbPersistence } from 'y-indexeddb';
import { Doc } from 'yjs';
import type { Database, Room, YDoc } from '..';
import { newMatrixProvider } from '../utils/connection';

/** adds an extra document and matrix provider to the matrix room, that isn't the central doc/provider which stores eweser documents but is instead used for something else. This is usually used provide a doc to collaborative editors like prosemirror  */
export const addTempDocToRoom =
  (_db: Database) =>
  (room: Room<any>, docRef: string): Promise<Doc | null> => {
    if (!_db.matrixClient)
      throw new Error("can't connect without matrixClient");

    const existing = room.tempDocs[docRef];
    const doc = new Doc();

    new IndexeddbPersistence(docRef, doc);
    const matrixProvider =
      existing?.matrixProvider ??
      newMatrixProvider(
        _db.matrixClient,
        doc as YDoc<any>,
        room.roomId
          ? { type: 'id', id: room.roomId }
          : { type: 'alias', alias: room.roomId },
        {
          translator: {
            updatesAsRegularMessages: false,
            updateEventType: 'matrix-crdt.doc_update' + docRef,
            snapshotEventType: 'matrix-crdt.doc_snapshot' + docRef,
          },
        }
      );
    return new Promise((resolve, reject) => {
      matrixProvider.initialize().catch((e) => {
        if (e.message === 'already initialized reader') {
          resolve(doc);
        } else {
          reject(e);
        }
      });
      matrixProvider.onDocumentAvailable(() => {
        room.tempDocs[docRef] = { doc, matrixProvider };
        resolve(doc);
      });
      // matrixProvider.onReceivedEvents(() => resolve(doc));
      matrixProvider.onDocumentUnavailable(() => reject(null));
    });
  };
