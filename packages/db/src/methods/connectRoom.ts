import { getRoomId, newEmptyRoom, newMatrixProvider } from './connectionUtils';
import { initialRegistryStore } from '../collections';
import { CollectionKey, ConnectStatus } from '../types';
import type { IDatabase, Documents, RegistryData, Room } from '../types';
import { Doc } from 'yjs';
// import { IndexeddbPersistence } from 'y-indexeddb';

async function setRoomNameAndId(_db: IDatabase, room: Room<any>, registryDoc: Doc) {
  if (!_db.matrixClient) throw new Error('matrixClient not found');
  const roomId = await _db.matrixClient.getRoomIdForAlias(room.roomAlias);
  if (!roomId?.room_id) throw new Error('could not get room id');
  room.roomId = roomId.room_id;
  if (roomId?.room_id) {
    const roomRes = await _db.matrixClient.getRoomSummary(roomId?.room_id);
    // console.log({ roomRes });

    if (roomRes && roomRes.name) {
      const roomName = roomRes.name;
      if (roomName) {
        room.name = roomName;
        registryStore.documents[0].notes[room.roomAlias].roomName = room.name;
      }
    } else {
      // const room2Res = await _db.matrixClient.getRooms();
      // console.log({ room2Res });
    }
  }
  // TODO: replace with Y.Doc setter
  registryStore.documents[0].notes[room.roomAlias].roomName = room.name;
}

export function changeStatus(
  room: Room<any>,
  status: ConnectStatus,
  onStatusChange?: (status: ConnectStatus) => void
) {
  room.connectStatus = status;
  if (onStatusChange) onStatusChange(status);
}

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
      if (!_db.matrixClient) throw new Error("can't connect without matrixClient");

      const room = _db.collections[collectionKey][roomAlias];
      console.log('connectMatrixProvider', { roomAlias, room, collections: _db.collections });
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
        room.roomId ? { type: 'id', id: room.roomId } : { type: 'alias', alias: roomAlias }
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

/** make sure to query the current collection to make sure the passed room's id and alias are correct.  */
export function connectRoom<T extends IDatabase>(
  this: IDatabase,
  /** full alias including host name :matrix.org */
  roomAlias: string,
  collectionKey: CollectionKey,
  registryStore?: RegistryStore,
  callback?: (status: ConnectStatus) => void
) {
  // This is a Promise because we need to wait for onDocumentAvailable to resolve
  return new Promise<boolean>((resolve, reject) => {
    // We need to figure out how to listen to whether the Y.Doc has synced with the matrix room and pulled the state, and only resolve then.

    try {
      const registryConnect = collectionKey === CollectionKey.registry;
      /** the internal room alias of the registry is always 0, so that you don't need to always `buildRoomAlias` to find it */
      const dbAlias = registryConnect ? 0 : roomAlias;

      if (!this.collections[collectionKey][dbAlias]) {
        this.collections[collectionKey][dbAlias] = newEmptyRoom<T>(collectionKey, roomAlias) as any;
      }
      const room = this.collections[collectionKey][dbAlias];
      if (!room) throw new Error('room not found');

      if (!this.matrixClient) throw new Error("can't connect without matrixClient");
      // quit early if already connected
      // if (room.doc && room.store && room.matrixProvider?.canWrite) {
      //   room.connectStatus = 'ok';
      //   if (callback) callback('ok');
      //   resolve(true);
      // }

      if (!room.doc) {
        room.doc = new Doc();
        // TODO: how to sync the doc?
      }

      room.connectStatus = 'loading';
      if (callback) callback('loading');
      // room.matrixProvider?.dispose();
      // room.matrixProvider = null;

      // new IndexeddbPersistence('my-document-id', room.doc);
      room.matrixProvider = newMatrixProvider({
        doc: room.doc,
        matrixClient: this.matrixClient,
        roomAlias,
      });

      room.matrixProvider.onDocumentAvailable((e) => {
        // console.log('onDocumentAvailable', e);

        // populate registry if it is empty
        if (registryStore && !registryStore?.documents[0]) {
          console.log('populating registry');
          registryStore.documents[0] = initialRegistryStore.documents[0];
        }

        if (!registryConnect && registryStore) {
          if (
            // if room not in registry
            !registryStore.documents[0].notes[roomAlias]
          ) {
            console.log('registering room in registry', roomAlias);
            registryStore.documents[0][room.collectionKey][roomAlias] = {
              roomAlias,
            };
          }
          if (!registryStore.documents[0].notes[roomAlias].roomName) {
            setRoomNameAndId(this, room, registryStore);
          } else if (!room.name) {
            room.name = registryStore.documents[0].notes[roomAlias].roomName;
          }
        }
        // console.log('room connected', room);
        room.connectStatus = 'ok';
        if (callback) callback('ok');
        return resolve(true);
      });
      room.matrixProvider.initialize();

      // room.matrixProvider.onDocumentUnavailable((e) => {
      //   console.log('onDocumentUnavailable', e);
      //   room.connectStatus = 'failed';
      //   if (callback) callback('failed');
      //   reject('onDocumentUnavailable');
      // });
    } catch (error) {
      console.log('connectRoom error', error);
      console.error(error);
      const room = this.collections[collectionKey][roomAlias];
      if (room) this.collections[room.collectionKey][room.roomAlias].connectStatus = 'failed';
      if (callback) callback('failed');
      return reject(false);
    }
  });
}
