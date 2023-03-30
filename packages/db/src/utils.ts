import type { DocumentBase } from './collections/documentBase';
import type { CollectionKey } from './types';

export const buildRef = (
  collection: CollectionKey,
  roomId: string | number,
  _id: string | number
) => `${collection}.${roomId}.${_id}`;

export const newDocument = <T>(
  doc: T,
  id: string,
  ref: string
): DocumentBase<T> => {
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

export const aliasKeyValidation = (aliasKey: string) => {
  if (aliasKey.length < 3)
    throw new Error('aliasKey must be at least 3 characters long');
  if (aliasKey.length > 52)
    throw new Error('aliasKey must be less than 52 characters long');
  if (aliasKey.includes('.'))
    throw new Error('aliasKey cannot contain a period');
  if (aliasKey.includes('@')) throw new Error('aliasKey cannot contain a @');
  if (aliasKey.includes(':')) throw new Error('aliasKey cannot contain a :');
  if (aliasKey.includes('/')) throw new Error('aliasKey cannot contain a /');
  if (aliasKey.includes('#')) throw new Error('aliasKey cannot contain a #');
  if (aliasKey.includes('~')) throw new Error('aliasKey cannot contain a #');
};
