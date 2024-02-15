import type { MatrixProvider, MatrixProviderOptions } from 'matrix-crdt';
import type { Database } from '../../';
import type { Room } from '../../types';

import { newMatrixProvider } from './newMatrixProvider';

export const checkMatrixProviderConnected = (
  provider?: MatrixProvider | null
) => {
  if (!provider) return false;

  // @ts-expect-error // private value
  if (provider.disposed) {
    return false;
  }
  // @ts-expect-error // private value
  if (provider._store?._disposed) {
    return false;
  }
  return provider.canWrite;
};

/** make sure to query the current collection to ensure the passed room's id and alias are correct. Make sure to initialize the Doc before calling  */
export function connectMatrixProvider(
  _db: Database,
  /** full alias including host name :matrix.org */
  room: Room<any>,
  options?: MatrixProviderOptions
) {
  const logger = (message: string, data?: any) =>
    _db.emit({
      event: 'connectMatrixProvider',
      message,
      data: { raw: data },
    });
  // This is a Promise because we need to wait for onDocumentAvailable to resolve
  return new Promise((resolve, reject) => {
    try {
      if (!_db.matrixClient) {
        throw new Error("can't connect without matrixClient");
      }

      if (!room?.ydoc) throw new Error('room.ydoc not found');

      logger('start connectMatrixProvider', { room, doc: room.ydoc });
      // quit early if already connected
      if (
        room.ydoc.isLoaded &&
        room.matrixProvider?.canWrite &&
        // @ts-expect-error
        !room.matrixProvider.disposed
      ) {
        logger('matrix provider already connected', {
          doc: room.ydoc,
          room,
          isLoaded: room.ydoc.isLoaded,
          canWrite: room.matrixProvider?.canWrite,
        });
        room.connectStatus = 'ok';
        return resolve(true);
      }

      room.connectStatus = 'loading';

      // room.matrixProvider?.dispose();
      // room.matrixProvider = null;

      room.matrixProvider = newMatrixProvider(
        _db.matrixClient,
        room.ydoc,
        room.roomId
          ? { type: 'id', id: room.roomId }
          : { type: 'alias', alias: room.roomId },
        options
      );

      room.matrixProvider.onDocumentAvailable((e) => {
        room.connectStatus = 'ok';
        logger('onDocumentAvailable', { room, doc: room.ydoc, e });
        return resolve(true);
      });

      room.matrixProvider.onDocumentUnavailable((e) => {
        room.connectStatus = 'disconnected';
        logger('onDocumentUnavailable', { room, doc: room.ydoc, e });
        reject('onDocumentUnavailable');
      });

      room.matrixProvider.initialize();
    } catch (error: any) {
      logger('connectMatrixProvider error', { error, room });
      // eslint-disable-next-line no-console
      console.error(error);

      if (room) {
        room.connectStatus = 'failed';
      }
      return reject(error.message);
    }
  });
}
