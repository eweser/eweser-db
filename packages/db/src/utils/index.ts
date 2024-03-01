import type { TypedMap } from 'yjs-types';
import type {
  CollectionKey,
  Room,
  Documents,
  EweDocument,
  DocumentWithoutBase,
  DocumentBase,
} from '../types';
import type { Database } from '..';

/** Sets the metadata like created and updated for the doc */
export const newDocument = <T extends EweDocument>(
  _id: string,
  _ref: string,
  doc: DocumentWithoutBase<T>
): T => {
  const now = new Date().getTime();
  const base: DocumentBase = {
    _created: now,
    _id,
    _ref,
    _updated: now,
    _deleted: false,
    _ttl: undefined,
  };
  // @ts-ignore
  return { ...base, ...doc };
};

/**
 *
 * @param collection e.g. `'flashcards'` "flashcards"
 * Params must be strings and cannot include `|`
 * @returns `${authServer}|${collectionKey}|${roomId}|${documentId}`
 * @example 'https://eweser.com|flashcards|room-id-uuid|doc-id-uuid'
 */
export const buildRef = (params: {
  collectionKey: CollectionKey;
  roomId: string;
  documentId: string | number;
  authServer: string;
}) => {
  Object.entries(params).forEach(([key, param]) => {
    if (!param) throw new Error(`${key} is required`);
    if (typeof param !== 'string') throw new Error(`${key} must be a string`);
    if (param.includes('|')) throw new Error(`${key} cannot include |`);
  });

  const { collectionKey, roomId, documentId, authServer } = params;
  // from large to small groupings
  return `${authServer}|${collectionKey}|${roomId}|${documentId}`;
};

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const randomString = (length: number) =>
  Math.random()
    .toString(36)
    .substring(2, length + 2);

export function getRoomDocuments<T extends EweDocument>(
  room: Room<T>
): TypedMap<Documents<T>> {
  if (!room.ydoc) throw new Error('room.ydoc not found');
  const registryMap = room.ydoc.getMap('documents');
  return registryMap;
}

export const getRoom =
  (_db: Database) =>
  <T extends EweDocument>({
    collectionKey,
    roomId,
  }: {
    collectionKey: CollectionKey;
    roomId: string;
  }) => {
    const room = _db.collections[collectionKey][roomId];
    if (!room) return null;
    return room as Room<T>;
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
