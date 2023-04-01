import type { DocumentBase } from './collections/documentBase';
import type { CollectionKey } from './types';

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 *
 * @param collection e.g. `CollectionKey.flashcards` "flashcards"
 * @param roomAlias  e.g. `'#roomName~flashcards~@username:matrix.org'`
 * @param documentID any number/string what doesn't include `.`
 * @returns `${collection}.${roomAlias}.${documentID}` e.g. `flashcards.#roomName~flashcards~@username:matrix.org.0`
 */
export const buildRef = ({
  collection,
  roomAlias,
  documentID,
}: {
  collection: CollectionKey;
  roomAlias: string | 0;
  documentID: string | number;
}) => {
  if (documentID.toString().includes('.')) {
    throw new Error('documentID cannot include .');
  }
  return `${collection}.${roomAlias}.${documentID}`;
};

export const newDocument = <T>(_ref: string, doc: T): DocumentBase<T> => {
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
