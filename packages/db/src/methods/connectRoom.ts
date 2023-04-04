import {
  connectMatrixProvider,
  getAliasNameFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
  newEmptyRoom,
} from '../connectionUtils';
import type { CollectionKey, Document, ConnectStatus, Room } from '../types';
import type { Database } from '..';
import { buildAliasFromSeed, getCollectionRegistry } from '..';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { waitForRegistryPopulated } from '../connectionUtils/populateRegistry';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';

const checkIfRoomIsInRegistry = async (
  _db: Database,
  roomAliasSeed: string,
  collectionKey: CollectionKey
) => {
  if (!_db.matrixClient) throw new Error('matrixClient not found');
  if (!_db.userId) throw new Error('userId not found');
  if (!roomAliasSeed) throw new Error('roomAliasSeed not provided');
  const roomAlias = buildAliasFromSeed(
    roomAliasSeed,
    collectionKey,
    _db.userId
  );

  await waitForRegistryPopulated(_db);
  // check registry initialized
  if (_db.collections.registry[0].connectStatus !== 'ok')
    throw new Error('registry not initialized');
  // check if the room is in the registry
  const collectionRegistry = getCollectionRegistry(_db, collectionKey);
  const registryEntry = collectionRegistry[roomAliasSeed];
  if (!registryEntry?.roomAlias)
    throw new Error('roomAlias not found in registry');
  if (registryEntry.roomAlias !== roomAlias)
    throw new Error('roomAlias does not match registry');
  return registryEntry;
};

/**
 * Note that the room must have been created already and the roomAlias must be in the registry
 * 1. Joins the Matrix room if not in it
 * 2. Creates a Y.Doc, syncs with localStorage (indexeddb) and saves it to the room object
 * 3. Creates a matrixCRDT provider and saves it to the room object
 * 4. Save the room's metadata to the registry (if not already there)
 * 5. saves teh room to the DB.collections, indexed by the roomAliasSeed, including the name of the collection
 *  Provides status updates using the DB.emit() method
 */

export const connectRoom =
  (_db: Database) =>
  async <T extends Document>(
    roomAliasSeed: string,
    collectionKey: CollectionKey
  ) => {
    try {
      if (!roomAliasSeed) throw new Error('roomAliasSeed not provided');

      const roomAlias = buildAliasFromSeed(
        roomAliasSeed,
        collectionKey,
        _db.userId
      );
      const roomAliasName = getAliasNameFromAlias(roomAlias);
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
          },
          message,
        });
      const room =
        _db.collections[collectionKey][roomAliasName] ||
        newEmptyRoom<T>(collectionKey, roomAlias);
      _db.collections[collectionKey][roomAliasSeed] = room;
      logger('starting connectRoom', room.connectStatus);

      if (room.matrixProvider?.canWrite && !!room.ydoc?.store) {
        room.connectStatus = 'ok';
        logger('room is already connected', room.connectStatus, {
          canWrite: room.matrixProvider?.canWrite,
          ydocStore: room.ydoc?.store,
        });
        return room as Room<T>;
      }

      await checkIfRoomIsInRegistry(_db, roomAliasSeed, collectionKey);

      const roomId = await getRoomId(_db.matrixClient, roomAlias);
      if (!roomId) {
        throw new Error('could not get room id. Room has not been created yet');
      }
      const matrixRoom = await joinRoomIfNotJoined(_db.matrixClient, roomId);
      logger('room joined', room.connectStatus, matrixRoom);

      const { ydoc } = await initializeDocAndLocalProvider<any>(roomAliasSeed);
      if (!ydoc) throw new Error('ydoc not found');
      room.ydoc = ydoc;
      logger('ydoc created', room.connectStatus, ydoc);

      await connectMatrixProvider(_db, room);
      logger('matrix provider connected', room.connectStatus);

      const roomName = matrixRoom.name;
      updateRegistryEntry(_db, {
        collectionKey,
        roomAliasSeed,
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
        data: { collectionKey, raw: { error, roomAliasSeed } },
      });
      return null;
    }
  };
