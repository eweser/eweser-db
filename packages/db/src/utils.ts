import type { TypedMap } from 'yjs-types';
import type { DocumentBase } from './collections/documentBase';
import type {
  CollectionKey,
  Room,
  Documents,
  RegistryData,
  CollectionType,
} from './types';
import type { Database } from '.';

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 *
 * @param collection e.g. `CollectionKey.flashcards` "flashcards"
 * @param roomAliasSeed  e.g. just `roomName` if the full alias is '#roomName~flashcards~@username:matrix.org'`
 * @param documentID any number/string what doesn't include `.`
 * @returns `${collection}.${roomAlias}.${documentID}` e.g. `flashcards.#roomName~flashcards~@username:matrix.org.0`
 */
export const buildRef = ({
  collection,
  roomAliasSeed,
  documentID,
}: {
  collection: CollectionKey;
  roomAliasSeed: string;
  documentID: string | number;
}) => {
  if (documentID.toString().includes('.') || roomAliasSeed.includes('.')) {
    throw new Error('documentID cannot include .');
  }
  return `${collection}.${roomAliasSeed}.${documentID}`;
};

export const newDocument = <T extends CollectionType>(
  _ref: string,
  doc: T
): DocumentBase<T> => {
  const _id = _ref.split('.').pop();
  if (!_id) throw new Error('no _id found in ref');

  const now = new Date().getTime();
  return {
    _created: now,
    _id,
    _ref,
    _updated: now,
    _deleted: false,
    _ttl: undefined,
    ...doc,
  };
};

export function getRoomDocumentsYMap<T extends CollectionType>(
  room: Room<T>
): TypedMap<Documents<T>> {
  if (!room.ydoc) throw new Error('room.ydoc not found');
  const registryMap = room.ydoc.getMap('documents');
  return registryMap;
}

/** this in an uneditable version. use getRegistry() then .get('0') for the registry document  */
export function getCollectionRegistry(
  _db: Database,
  collectionKey: CollectionKey
) {
  const registry = getRegistry(_db);
  const registryDocument = registry.get('0');
  if (!registryDocument) throw new Error('registryDocument not found');
  const collectionRegistry = registryDocument[collectionKey];
  if (!collectionRegistry) throw new Error('collectionRegistry not found');
  return collectionRegistry;
}

/** returns an editable YMap of the registry */
export function getRegistry(_db: Database): TypedMap<Documents<RegistryData>> {
  const registry = getRoomDocumentsYMap<RegistryData>(
    _db.collections.registry[0]
  );
  if (!registry) throw new Error('registry not found');
  return registry;
}
