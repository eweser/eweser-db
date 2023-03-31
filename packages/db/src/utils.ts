import type { DocumentBase } from './collections/documentBase';
import type { CollectionKey } from './types';

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

export const aliasNameValidation = (aliasName: string) => {
  if (aliasName.length < 3)
    throw new Error('aliasName must be at least 3 characters long');
  if (aliasName.length > 52)
    throw new Error('aliasName must be less than 52 characters long');
  if (aliasName.includes('.'))
    throw new Error('aliasName cannot contain a period');
  if (aliasName.includes('@')) throw new Error('aliasName cannot contain a @');
  if (aliasName.includes(':')) throw new Error('aliasName cannot contain a :');
  if (aliasName.includes('/')) throw new Error('aliasName cannot contain a /');
  if (aliasName.includes('#')) throw new Error('aliasName cannot contain a #');
  if (aliasName.includes('~')) throw new Error('aliasName cannot contain a #');
};
