import type {
  CollectionKey,
  Document,
  ConnectStatus,
  Room,
  LoginData,
  CreateAndConnectRoomOptions,
} from '../types';
import type { Database } from '../';
import { getOrSetRoom, buildAliasFromSeed } from '../utils';

import {
  LocalStorageKey,
  localStorageGet,
} from '../utils/db/localStorageService';
import {
  checkMatrixProviderConnected,
  connectMatrixProvider,
  getroomIdFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
  updateRegistryEntry,
  checkWebRtcConnection,
  waitForRegistryPopulated,
  connectWebRtcProvider,
  initializeDocAndLocalProvider,
  waitForWebRtcConnection,
  autoReconnect,
} from '../utils';
import { populateInitialValues } from '../utils/db/populateInitialValues';

const checkIfRoomIsInRegistry = async (
  _db: Database,
  roomId: string,
  collectionKey: CollectionKey
) => {
  if (!_db.matrixClient) throw new Error('matrixClient not found');
  if (!_db.userId) throw new Error('userId not found');
  if (!roomId) throw new Error('roomId not provided');
  const roomId = buildAliasFromSeed(roomId, collectionKey, _db.userId);

  const registryReady = await waitForRegistryPopulated(_db);
  if (!registryReady) throw new Error('registry not yet ready');

  const collectionRegistry = _db.getCollectionRegistry(collectionKey);
  const registryEntry = collectionRegistry[roomId];
  if (!registryEntry?.roomId) throw new Error('roomId not found in registry');
  if (registryEntry.roomId !== roomId)
    throw new Error('roomId does not match registry');
  return registryEntry;
};

export type ConnectRoomOptions<T extends Document> = Omit<
  CreateAndConnectRoomOptions<T>,
  'name' | 'topic'
>;

const disconnectWhenOffline = (
  _db: Database,
  { roomId, collectionKey }: { roomId: string; collectionKey: CollectionKey }
) => {
  _db.on(roomId + '_disconnectListener', async ({ event, data }) => {
    if (event === 'onlineChange' && !data?.online) {
      if (!roomId) throw new Error('roomId not set');
      if (!collectionKey) throw new Error('collectionKey not set');
      const roomId = getroomIdFromAlias(roomId);
      _db.disconnectRoom({
        collectionKey,
        roomId,
        removeReconnectListener: false,
      });
    }
  });
};

export const connectRoom =
  (_db: Database) =>
  /**
   * Note that the room must have been created already and the roomId must be in the registry
   * Returns a string if there was an error, otherwise returns the room object
   * 1. Joins the Matrix room if not in it
   * 2. Creates a Y.Doc, syncs with localStorage (indexeddb) and saves it to the room object
   * 3. Creates a matrixCRDT provider and saves it to the room object
   * 4. Save the room's metadata to the registry (if not already there)
   * 5. saves teh room to the DB.collections, indexed by the roomId, including the name of the collection
   * 6. Populates the ydoc with initial values if passed any
   *  Provides status updates using the DB.emit() method
   * 7. Sets up a listener for if going from offline to online, and then re-connects the room
   * 8. Sets up a listener for if going from online to offline, and then disconnects the room
   */
  async <T extends Document>(
    params: ConnectRoomOptions<T>
  ): Promise<Room<T> | string> => {
    const { collectionKey, roomId, initialValues, waitForWebRTC } = params;
    try {
      if (!roomId) throw new Error('roomId not provided');
      const roomId = buildAliasFromSeed(roomId, collectionKey, _db.userId);
      const logger = (
        message: string,
        connectStatus: ConnectStatus,
        data?: any
      ) =>
        _db.emit({
          event: 'connectRoom',
          data: {
            collectionKey,
            roomId,
            raw: data,
            connectStatus,
            roomId,
          },
          message,
        });

      const room = getOrSetRoom(_db)(collectionKey, roomId);

      // set up auto reconnect listener when coming online (remember to call disconnectRoom to remove it)
      autoReconnect(_db, room, params);
      // disconnect room on when going offline
      disconnectWhenOffline(_db, { roomId, collectionKey });

      logger('starting connectRoom', room.connectStatus);

      const matrixConnected = _db.useMatrix
        ? checkMatrixProviderConnected(room.matrixProvider)
        : true;
      const indexedDBConnected = _db.useIndexedDB
        ? room.indexeddbProvider?.name === roomId
        : true;
      const webRtcConnected = _db.useWebRTC
        ? checkWebRtcConnection(room.webRtcProvider)
        : true;

      if (matrixConnected && indexedDBConnected && webRtcConnected) {
        room.connectStatus = 'ok';
        logger('room is already connected', room.connectStatus, {
          canWrite: room.matrixProvider?.canWrite,
          ydocStore: room.ydoc?.store,
        });
        if (initialValues) {
          populateInitialValues(initialValues, room as any);
          logger('initialValues populated', room.connectStatus, initialValues);
        }
        return room as Room<T>;
      }

      if (_db.useIndexedDB && !indexedDBConnected) {
        const { ydoc: localDoc, localProvider } =
          await initializeDocAndLocalProvider<any>(roomId, room.ydoc);
        room.ydoc = localDoc;
        room.indexeddbProvider = localProvider;
      }

      if (!room.ydoc) throw new Error('ydoc not found');
      logger('ydoc created', room.connectStatus, room.ydoc);

      if (initialValues) {
        populateInitialValues(initialValues, room as any);
        logger('initialValues populated', room.connectStatus, initialValues);
      }

      if (_db.useWebRTC && !webRtcConnected && _db.webRtcPeers.length > 0) {
        try {
          let provider = room.webRtcProvider;
          const password =
            localStorageGet<LoginData>(LocalStorageKey.loginData)?.password ??
            '';
          if (provider) {
            provider.doc = room.ydoc as any;
            provider.connect();
          } else {
            const { provider: newProvider } = connectWebRtcProvider(
              _db,
              roomId,
              room.ydoc as any,
              password
            );
            provider = newProvider;
          }

          if (waitForWebRTC) {
            await waitForWebRtcConnection(provider);
          }
          room.webRtcProvider = provider;
          logger('webRtc connected', room.connectStatus, provider);
        } catch (error) {
          logger('error connecting to webRtc', room.connectStatus, error);
        }
      }

      const registryEntry = await checkIfRoomIsInRegistry(
        _db,
        roomId,
        collectionKey
      );

      if (!_db.useMatrix) {
        logger(
          'room connected successfully. Not connecting Matrix',
          room.connectStatus
        );
        return room as Room<T>;
      }

      const roomId = registryEntry.roomId || (await getRoomId(_db, roomId));
      if (!roomId) {
        throw new Error('could not get room id. Room has not been created yet');
      }
      room.roomId = roomId;
      room.roomId = roomId;

      const matrixRoom = await joinRoomIfNotJoined(_db, roomId);
      logger('room joined', room.connectStatus, matrixRoom);

      await connectMatrixProvider(_db, room);
      logger('matrix provider connected', room.connectStatus);

      const roomName = matrixRoom.name;
      updateRegistryEntry(_db, {
        collectionKey,
        roomId,
        roomId,
        roomId,
        roomName,
      });
      room.name = roomName;
      logger('room connected successfully', room.connectStatus);

      return room as Room<T>;
    } catch (error) {
      _db.emit({
        event: 'connectRoom',
        level: 'error',
        message: 'error in createAndConnectRoom',
        data: { collectionKey, raw: { error, roomId } },
      });
      return error.message;
    }
  };
