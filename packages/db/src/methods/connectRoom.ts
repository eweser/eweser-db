import {
  connectMatrixProvider,
  getAliasNameFromAlias,
  getRoomId,
  joinRoomIfNotJoined,
  newEmptyRoom,
} from '../connectionUtils';
import type { CollectionKey } from '../types';
import type { IDatabase } from '../types';
import { buildAliasFromSeed, getCollectionRegistry } from '..';
import { initializeDocAndLocalProvider } from '../connectionUtils/initializeDoc';
import { waitForRegistryPopulated } from '../connectionUtils/populateRegistry';
import { updateRegistryEntry } from '../connectionUtils/saveRoomToRegistry';
// import { IndexeddbPersistence } from 'y-indexeddb';

const checkIfRoomIsInRegistry = async (
  _db: IDatabase,
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
 *  Provides status updates using the DB.emit() method
 */
export async function connectRoom<T = any>(
  this: IDatabase,
  roomAliasSeed: string,
  collectionKey: CollectionKey
) {
  if (!roomAliasSeed) throw new Error('roomAliasSeed not provided');

  const roomAlias = buildAliasFromSeed(
    roomAliasSeed,
    collectionKey,
    this.userId
  );
  const roomAliasName = getAliasNameFromAlias(roomAlias);
  const connectRoomLogger = (message: string) =>
    this.emit({
      event: 'DB.connectRoom',
      data: {
        collectionKey,
        roomAlias,
      },
      message,
    });
  connectRoomLogger('starting connectRoom');

  const room =
    this.collections[collectionKey][roomAliasName] ||
    newEmptyRoom<T>(collectionKey, roomAlias);

  if (room.matrixProvider?.canWrite && !!room.ydoc?.store) {
    connectRoomLogger('room is already connected');
    return room;
  }

  await checkIfRoomIsInRegistry(this, roomAliasSeed, collectionKey);

  const roomId = await getRoomId(this.matrixClient, roomAlias);
  if (!roomId) {
    throw new Error('could not get room id. Room has not been created yet');
  }
  const matrixRoom = await joinRoomIfNotJoined(this.matrixClient, roomId);
  connectRoomLogger('room joined');

  const { ydoc } = await initializeDocAndLocalProvider(roomAliasSeed);
  if (!ydoc) throw new Error('ydoc not found');
  room.ydoc = ydoc;
  connectRoomLogger('ydoc created');

  await connectMatrixProvider(this, room);
  connectRoomLogger('matrix provider connected');

  const roomName = matrixRoom.name;
  updateRegistryEntry(this, {
    collection: collectionKey,
    roomAliasSeed,
    roomId,
    roomAlias,
    roomName,
  });
  connectRoomLogger('registry updated');

  return room;
}
