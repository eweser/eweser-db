import { CollectionKey } from '../../types';
import { roomIdValidation } from '../connection';

/**
 *
 * @param ref valid ref e.g. `collectionKey.roomId.doc-id`
 * Validates the ref and returns the parts
 */
export const parseRef = (ref: string) => {
  const parts = ref.split('.');
  if (parts.length !== 3) throw new Error('ref must have 3 parts');
  const [collectionKey, roomId, documentId] = parts;
  if (!collectionKey || !roomId || !documentId)
    throw new Error('ref must have 3 parts');

  roomIdValidation(roomId);

  // check that collectionKey is a valid collectionKey
  if (!Object.values(CollectionKey).includes(collectionKey as CollectionKey)) {
    throw new Error('collectionKey is not a valid collectionKey');
  }

  return {
    collectionKey: collectionKey as CollectionKey,
    roomId,
    documentId,
  };
};
