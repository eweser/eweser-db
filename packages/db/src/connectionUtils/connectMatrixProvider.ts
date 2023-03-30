import { CollectionKey, ConnectStatus, IDatabase } from '../types';
import { changeStatus } from './changeStatus';
import { newMatrixProvider } from './newMatrixProvider';

/** make sure to query the current collection to ensure the passed room's id and alias are correct. Make sure to initialize the Doc before calling  */
export function connectMatrixProvider(
  _db: IDatabase,
  /** full alias including host name :matrix.org */
  roomAlias: string,
  collectionKey: CollectionKey,
  onStatusChange?: (status: ConnectStatus) => void
) {
  // This is a Promise because we need to wait for onDocumentAvailable to resolve
  return new Promise((resolve, reject) => {
    try {
      if (!_db.matrixClient)
        throw new Error("can't connect without matrixClient");

      const room = _db.collections[collectionKey][roomAlias];
      console.log('connectMatrixProvider', {
        roomAlias,
        room,
        collections: _db.collections,
      });
      if (!room?.doc) throw new Error('room.doc not found');
      const doc = room.doc;

      // quit early if already connected
      if (doc.isLoaded && room.matrixProvider?.canWrite) {
        console.log(
          'matrix provider already connected, ',
          doc.isLoaded,
          room.matrixProvider?.canWrite
        );
        changeStatus(room, 'ok', onStatusChange);
        return resolve(true);
      }

      changeStatus(room, 'loading', onStatusChange);
      // room.matrixProvider?.dispose();
      // room.matrixProvider = null;

      room.matrixProvider = newMatrixProvider(
        _db.matrixClient,
        doc,
        room.roomId
          ? { type: 'id', id: room.roomId }
          : { type: 'alias', alias: roomAlias }
      );

      room.matrixProvider.onDocumentAvailable((e) => {
        console.log('onDocumentAvailable', e);
        changeStatus(room, 'ok', onStatusChange);
        return resolve(true);
      });

      room.matrixProvider.initialize();

      room.matrixProvider.onDocumentUnavailable((e) => {
        console.log('onDocumentUnavailable');
        changeStatus(room, 'disconnected', onStatusChange);
        // reject('onDocumentUnavailable');
      });
    } catch (error: any) {
      console.log('connectRoom error', error);
      console.error(error);
      const room = _db.collections[collectionKey][roomAlias];
      if (room) {
        changeStatus(room, 'failed', onStatusChange);
      }
      return reject(error.message);
    }
  });
}
