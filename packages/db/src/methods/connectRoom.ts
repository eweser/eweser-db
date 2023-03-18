import { syncedStore, getYjsValue } from '@syncedstore/core';

import { newEmptyRoom, newMatrixProvider } from './connectionUtils';
import { initialRegistryStore } from '../collections';
import { CollectionKey, ConnectStatus } from '../types';
import type { IDatabase, Documents, RegistryData, Room } from '../types';
import type { default as Y } from 'yjs';
// import { IndexeddbPersistence } from 'y-indexeddb';

type RegistryStore = {
  documents: Documents<RegistryData>;
};

async function setRoomNameAndId(_db: IDatabase, room: Room<any>, registryStore: RegistryStore) {
  const roomId = await _db.matrixClient?.getRoomIdForAlias(room.roomAlias);
  if (roomId?.room_id && _db.matrixClient) {
    const roomRes = await _db.matrixClient?.getRoomSummary(roomId?.room_id);
    // console.log({ roomRes });

    if (roomRes && roomRes.name) {
      const roomName = roomRes.name;
      if (roomName) {
        room.name = roomName;
        registryStore.documents[0].notes[room.roomAlias].roomName = room.name;
      }
    } else {
      const room2Res = await _db.matrixClient?.getRooms();
      // console.log({ room2Res });
    }
  }
  registryStore.documents[0].notes[room.roomAlias].roomName = room.name;
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
  return new Promise<boolean>((resolve, reject) => {
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
      // if (room.doc && room.store && room.matrixProvider?.canWrite) {
      //   room.connectStatus = 'ok';
      //   if (callback) callback('ok');
      //   resolve(true);
      // }

      if (!room.doc) {
        const store = syncedStore({ documents: {} });
        const doc = getYjsValue(store) as Y.Doc;
        room.doc = doc;
        room.store = store;
      } else {
        const store = syncedStore({ documents: {} }, room.doc);
        room.store = store;
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

      // room.matrixProvider.onReceivedEvents((events) => {
      //   console.log('onReceivedEvents', events);
      // });
      // room.matrixProvider.onCanWriteChanged((canWrite) => {
      //   // console.log('canWrite', canWrite);
      //   room.connectStatus = 'ok';
      //   if (callback) callback('ok');
      //   return resolve(true);
      // });
      // connect or fail callbacks:
      // room.matrixProvider.matrixReader?.onEvents((e) => {
      //   console.log('onEvents', e);
      // });
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
