import type { CollectionKey } from '../../types';

/**
 *
 * @param collection e.g. `CollectionKey.flashcards` "flashcards"
 * @param aliasSeed  e.g. just `roomName` if the full alias is '#roomName~flashcards~@username:matrix.org'`
 * @param documentId any number/string what doesn't include `.`
 * @returns `${collection}.${roomAlias}.${documentId}` e.g. `flashcards.#roomName~flashcards~@username:matrix.org.doc-id`
 */
export const buildRef = ({
  collectionKey,
  aliasSeed,
  documentId,
}: {
  collectionKey: CollectionKey;
  aliasSeed: string;
  documentId: string | number;
}) => {
  if (documentId.toString().includes('.') || aliasSeed.includes('.')) {
    throw new Error('documentId cannot include .');
  }
  return `${collectionKey}.${aliasSeed}.${documentId}`;
};
