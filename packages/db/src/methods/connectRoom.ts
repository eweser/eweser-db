import {
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
import { buildAliasFromSeed, getCollectionRegistry } from '..';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { waitForRegistryPopulated } from '../connectionUtils/populateRegistry';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';
import { connectWebRtcProvider } from '../connectionUtils/connectWebtRtc';
import { LocalStorageKey, localStorageGet } from '../utils/localStorageService';
import { Doc } from 'yjs';

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

  const collectionRegistry = getCollectionRegistry(_db, collectionKey);
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

/**
 * Note that the room must have been created already and the roomAlias must be in the registry
 * 1. Joins the Matrix room if not in it
 * 2. Creates a Y.Doc, syncs with localStorage (indexeddb) and saves it to the room object
 * 3. Creates a matrixCRDT provider and saves it to the room object
 * 4. Save the room's metadata to the registry (if not already there)
 * 5. saves teh room to the DB.collections, indexed by the aliasSeed, including the name of the collection
 *  Provides status updates using the DB.emit() method
 */

export const connectRoom =
  (_db: Database) =>
  async <T extends Document>({
    collectionKey,
    aliasSeed,
    initialValues,
  }: ConnectRoomOptions): Promise<Room<T>> => {
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

      logger('starting connectRoom', room.connectStatus);

      const matrixConnected = _db.useMatrix
        ? room.matrixProvider?.canWrite
        : true;
      const yDocConnected = _db.useIndexedDB
        ? room.indexeddbProvider?.name === aliasSeed
        : true;
      const webRtcConnected = _db.useWebRTC
        ? room.webRtcProvider?.connected
        : true;

      if (matrixConnected && yDocConnected && webRtcConnected) {
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

      let ydoc = new Doc() as YDoc<T>;
      if (_db.useIndexedDB) {
        const { ydoc: localDoc, localProvider } =
          await initializeDocAndLocalProvider<any>(aliasSeed);
        ydoc = localDoc;
        room.indexeddbProvider = localProvider;
      }

      if (!ydoc) throw new Error('ydoc not found');
      room.ydoc = ydoc;
      logger('ydoc created', room.connectStatus, ydoc);

      if (initialValues) {
        populateInitialValues(initialValues, room as any);
        logger('initialValues populated', room.connectStatus, initialValues);
      }

      if (_db.useWebRTC && _db.webRtcPeers.length > 0) {
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
          room.webRtcProvider = provider;
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
