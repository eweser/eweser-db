import type { TypedMap } from 'yjs-types';
import type {
  CollectionKey,
  Room,
  Documents,
  RegistryData,
  Document,
} from '../types';
import type { Database } from '..';
import { newEmptyRoom } from './db';

export * from './db';
export * from './connection';

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

export function getRoomDocuments<T extends Document>(
  room: Room<T>
): TypedMap<Documents<T>> {
  if (!room.ydoc) throw new Error('room.ydoc not found');
  const registryMap = room.ydoc.getMap('documents');
  return registryMap;
}

/** this in an uneditable version. use getRegistry() then .get('0') for the registry document  */
export const getCollectionRegistry =
  (_db: Database) => (collectionKey: CollectionKey) => {
    const registry = getRegistry(_db);
    const registryDocument = registry.get('0') as RegistryData;
    if (!registryDocument) throw new Error('registryDocument not found');
    const collectionRegistry = registryDocument[collectionKey];
    if (!collectionRegistry) throw new Error('collectionRegistry not found');
    return collectionRegistry;
  };

/** returns an editable YMap of the registry */
export function getRegistry(_db: Database): TypedMap<Documents<RegistryData>> {
  const registry = getRoomDocuments<RegistryData>(_db.collections.registry[0]);
  if (!registry) throw new Error('registry not found');
  return registry;
}

export const usernameValidation = (username: string) => {
  // cannot contain  `~`, `@`, and `:`  and `.`
  // must be between 3 and 32 characters
  if (username?.includes('@') && username?.includes(':')) {
    throw new Error(
      'userId   should be the base user ID without the the homeserver information, e.g. "jacob" not "@jacob:homserver.org". It cannot include @ or :'
    );
  }
  if (username.length < 3)
    throw new Error('username must be at least 3 characters long');
  if (username.length > 52)
    throw new Error('username must be less than 52 characters long');
  if (username.includes('.'))
    throw new Error('username cannot contain a period');
  if (username.includes('@')) throw new Error('username cannot contain a @');
  if (username.includes(':')) throw new Error('username cannot contain a :');
  if (username.includes('/')) throw new Error('username cannot contain a /');
  if (username.includes('#')) throw new Error('username cannot contain a #');
  if (username.includes('~')) throw new Error('username cannot contain a ~');
};

export const getRoom =
  (_db: Database) =>
  <T extends Document>(collectionKey: CollectionKey, aliasSeed: string) => {
    const room = _db.collections[collectionKey][aliasSeed];
    if (!room) return null;
    return room as Room<T>;
  };

export const getOrSetRoom =
  (_db: Database) =>
  <T extends Document>(collectionKey: CollectionKey, aliasSeed: string) => {
    const room = _db.getRoom<T>(collectionKey, aliasSeed);
    if (room) return room;
    const newRoom = newEmptyRoom<T>(_db, collectionKey, aliasSeed);
    _db.collections[collectionKey][aliasSeed] = newRoom as Room<any>;
    return newRoom;
  };

export const buildFullUserId = (username: string, homeserver: string) => {
  if (!username) throw new Error('username is required');
  if (!homeserver) throw new Error('homeserver is required');
  const homeserverParsed =
    homeserver.includes('http://') || homeserver.includes('https://')
      ? homeserver.split('://')[1]
      : homeserver;

  return `@${username}:${homeserverParsed}`;
};

/** returns the local part of a userId.
 * @example extractUserIdLocalPart('@username:matrix.org') => 'username'
 */
export const extractUserIdLocalPart = (userId: string) => {
  if (!userId) throw new Error('userId is required');
  if (!userId.includes('@')) throw new Error('userId is invalid');
  if (!userId.includes(':')) throw new Error('userId is invalid');
  return userId.split('@')[1].split(':')[0];
};
