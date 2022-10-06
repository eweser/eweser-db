import type { DocumentBase } from './collections/documentBase';
import type { CollectionKey } from './types';

export const buildRef = (
  collection: CollectionKey,
  roomId: string | number,
  _id: string | number
) => `${collection}.${roomId}.${_id}`;

export const newDocument = <T>(doc: T, id: string, ref: string): DocumentBase<T> => {
  const now = new Date().getTime();
  return {
    _created: now,
    _id: id,
    _ref: ref,
    _updated: now,
    _deleted: false,
    _ttl: undefined,
    ...doc,
  };
};
