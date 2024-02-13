import type { CollectionKey } from '../../types';

/**
 *
 * @param collection e.g. `CollectionKey.flashcards` "flashcards"
 * @param roomId  format `<auth-server>|<uuid>` @example 'https://eweser.com|uuid'
 * @param documentId any number/string what doesn't include `|`
 * @returns `${collection}|${roomId}|${documentId}` @example 'flashcards.https://eweser.com|uuid.doc-id'
 */
export const buildRef = ({
  collectionKey,
  roomId,
  documentId,
}: {
  collectionKey: CollectionKey;
  roomId: string;
  documentId: string | number;
}) => {
  if (documentId.toString().includes('|')) {
    throw new Error('documentId cannot include |');
  }
  // roomId should have one |
  if (roomId.split('|').length !== 2) {
    throw new Error('roomId must have exactly one |');
  }
  return `${collectionKey}|${roomId}|${documentId}`;
};
