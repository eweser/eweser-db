import { CollectionKey } from '../../types';
import { aliasSeedValidation } from '../connection';

/**
 *
 * @param ref valid ref e.g. `collectionKey.aliasSeed.doc-id`
 * Validates the ref and returns the parts
 */
export const parseRef = (ref: string) => {
  const parts = ref.split('.');
  if (parts.length !== 3) throw new Error('ref must have 3 parts');
  const [collectionKey, aliasSeed, documentId] = parts;
  if (!collectionKey || !aliasSeed || !documentId)
    throw new Error('ref must have 3 parts');

  aliasSeedValidation(aliasSeed);

  // check that collectionKey is a valid collectionKey
  if (!Object.values(CollectionKey).includes(collectionKey as CollectionKey)) {
    throw new Error('collectionKey is not a valid collectionKey');
  }

  return {
    collectionKey: collectionKey as CollectionKey,
    aliasSeed,
    documentId,
  };
};
