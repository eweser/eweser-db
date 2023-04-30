import {
  checkMatrixProviderConnected,
  connectMatrixProvider,
  getAliasSeedFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
} from '../connectionUtils';
import type {
  CollectionKey,
  Document,
  ConnectStatus,
  Room,
  LoginData,
  YDoc,
  CreateAndConnectRoomOptions,
  UserDocument,
} from '../types';
import type { Database } from '..';
import { buildRef, newDocument, randomString } from '..';
import { getOrSetRoom } from '..';
import { buildAliasFromSeed } from '..';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { waitForRegistryPopulated } from '../connectionUtils/populateRegistry';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';
import {
  checkWebRtcConnection,
  connectWebRtcProvider,
  waitForWebRtcConnection,
} from '../connectionUtils/connectWebRtc';
import { LocalStorageKey, localStorageGet } from '../utils/localStorageService';
import { Doc } from 'yjs';
import { autoReconnect } from '../connectionUtils/autoReconnect';

const checkIfRoomIsInRegistry = async (
  _db: Database,
  aliasSeed: string,
  collectionKey: CollectionKey
) => {
  if (!_db.matrixClient) throw new Error('matrixClient not found');
  if (!_db.userId) throw new Error('userId not found');
  if (!aliasSeed) throw new Error('aliasSeed not provided');
  const roomAlias = buildAliasFromSeed(aliasSeed, collectionKey, _db.userId);

  const registryReady = await waitForRegistryPopulated(_db);
  if (!registryReady) throw new Error('registry not yet ready');

  const collectionRegistry = _db.getCollectionRegistry(collectionKey);
  const registryEntry = collectionRegistry[aliasSeed];
  if (!registryEntry?.roomAlias)
    throw new Error('roomAlias not found in registry');
  if (registryEntry.roomAlias !== roomAlias)
    throw new Error('roomAlias does not match registry');
  return registryEntry;
};

const populateInitialValues = <T extends UserDocument>(
  initialValues: Partial<T>[],
  room: Room<T>
) => {
  const cleanupPassedInDocument = (doc: Partial<T>): T => {
    if (!doc) throw new Error('doc not provided');
    if (!room.roomAlias) throw new Error('roomAlias not set');
    const { _id, _ref, _created, _updated, _deleted, _ttl, ...rest } = doc;
    const aliasSeed = getAliasSeedFromAlias(room.roomAlias);
    const newDoc = newDocument<T>(
      _ref ??
        buildRef({
          collectionKey: room.collectionKey as CollectionKey,
          aliasSeed,
          documentId: _id ?? randomString(16),
        }),
      rest as any
    );
    if (_created) newDoc._created = _created;
    if (_updated) newDoc._updated = _updated;
    if (_deleted) newDoc._deleted = _deleted;
    if (_ttl) newDoc._ttl = _ttl;
    return newDoc;
  };
  const populatedInitialValues = initialValues.map(cleanupPassedInDocument);
  populatedInitialValues.forEach((doc) => {
    room.ydoc?.getMap('documents').set(doc._id, doc);
  });
};

export type ConnectRoomOptions = Omit<
  CreateAndConnectRoomOptions,
  'name' | 'topic'
>;

const disconnectWhenOffline = (
  _db: Database,
  {
    roomAlias,
    collectionKey,
  }: { roomAlias: string; collectionKey: CollectionKey }
) => {
  _db.on(roomAlias + '_disconnectListener', async ({ event, data }) => {
    if (event === 'onlineChange' && !data?.online) {
      if (!roomAlias) throw new Error('roomAlias not set');
      if (!collectionKey) throw new Error('collectionKey not set');
      const aliasSeed = getAliasSeedFromAlias(roomAlias);
      _db.disconnectRoom({
        collectionKey,
        aliasSeed,
        removeReconnectListener: false,
      });
    }
  });
};

/**
 * Note that the room must have been created already and the roomAlias must be in the registry
 * Returns a string if there was an error, otherwise returns the room object
 * 1. Joins the Matrix room if not in it
 * 2. Creates a Y.Doc, syncs with localStorage (indexeddb) and saves it to the room object
 * 3. Creates a matrixCRDT provider and saves it to the room object
 * 4. Save the room's metadata to the registry (if not already there)
 * 5. saves teh room to the DB.collections, indexed by the aliasSeed, including the name of the collection
 * 6. Populates the ydoc with initial values if passed any
 *  Provides status updates using the DB.emit() method
 * 7. Sets up a listener for if going from offline to online, and then re-connects the room
 * 8. Sets up a listener for if going from online to offline, and then disconnects the room
 */
export const connectRoom =
  (_db: Database) =>
  async <T extends Document>(
    params: ConnectRoomOptions
  ): Promise<Room<T> | string> => {
    const { collectionKey, aliasSeed, initialValues, waitForWebRTC } = params;
    try {
      if (!aliasSeed) throw new Error('aliasSeed not provided');
      const roomAlias = buildAliasFromSeed(
        aliasSeed,
        collectionKey,
        _db.userId
      );
      const logger = (
        message: string,
        connectStatus: ConnectStatus,
        data?: any
      ) =>
        _db.emit({
          event: 'connectRoom',
          data: {
            collectionKey,
            roomAlias,
            raw: data,
            connectStatus,
            aliasSeed,
          },
          message,
        });

      const room = getOrSetRoom(_db)(collectionKey, aliasSeed);

      // set up auto reconnect listener when coming online (remember to call disconnectRoom to remove it)
      autoReconnect(_db, room, params);
      // disconnect room on when going offline
      disconnectWhenOffline(_db, { roomAlias, collectionKey });

      logger('starting connectRoom', room.connectStatus);

      const matrixConnected = _db.useMatrix
        ? checkMatrixProviderConnected(room.matrixProvider)
        : true;
      const indexedDBConnected = _db.useIndexedDB
        ? room.indexeddbProvider?.name === aliasSeed
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

      const ydoc = room.ydoc?.store ?? (new Doc() as YDoc<T>);

      if (_db.useIndexedDB && !indexedDBConnected) {
        const { ydoc: localDoc, localProvider } =
          await initializeDocAndLocalProvider<any>(aliasSeed);
        room.ydoc = localDoc;
        room.indexeddbProvider = localProvider;
      }

      if (!ydoc) throw new Error('ydoc not found');
      logger('ydoc created', room.connectStatus, ydoc);

      if (initialValues) {
        populateInitialValues(initialValues, room as any);
        logger('initialValues populated', room.connectStatus, initialValues);
      }

      if (_db.useWebRTC && !webRtcConnected && _db.webRtcPeers.length > 0) {
        try {
          const password =
            localStorageGet<LoginData>(LocalStorageKey.loginData)?.password ??
            '';
          const { provider, doc } = connectWebRtcProvider(
            _db,
            roomAlias,
            ydoc as Doc,
            password
          );
          room.ydoc = doc as any;
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
        aliasSeed,
        collectionKey
      );

      if (!_db.useMatrix) {
        logger(
          'room connected successfully. Not connecting Matrix',
          room.connectStatus
        );
        return room as Room<T>;
      }

      const roomId = registryEntry.roomId || (await getRoomId(_db, roomAlias));
      if (!roomId) {
        throw new Error('could not get room id. Room has not been created yet');
      }
      room.roomId = roomId;
      room.roomAlias = roomAlias;

      const matrixRoom = await joinRoomIfNotJoined(_db, roomId);
      logger('room joined', room.connectStatus, matrixRoom);

      await connectMatrixProvider(_db, room);
      logger('matrix provider connected', room.connectStatus);

      const roomName = matrixRoom.name;
      updateRegistryEntry(_db, {
        collectionKey,
        aliasSeed,
        roomId,
        roomAlias,
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
        data: { collectionKey, raw: { error, aliasSeed } },
      });
      return error.message;
    }
  };
