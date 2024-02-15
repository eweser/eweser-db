// We need to distinguish 3 kinds of 'alias' in matrix:
// 1. full room aliases: #roomName_username:matrix.org -- these we'll call `alias` in the code
// 2. the alias seed that a user will input: roomName -- these we'll call `roomId` in the code
// 3. the alias seed plus eweser metadata (collection key and user name) -- these we'll call `aliasName` in the code

// `.`, `~`, `@`, and `:` must be restricted in the alias seed, because they are used to separate the alias seed from the user name and collection key in the alias name

import type { CollectionKey } from '../../types';

export const roomIdValidation = (roomId: string) => {
  if (roomId.length < 3)
    throw new Error('roomId must be at least 3 characters long');
  if (roomId.length > 52)
    throw new Error('roomId must be less than 52 characters long');
  if (roomId.includes('.')) throw new Error('roomId cannot contain a period');
  if (roomId.includes('@')) throw new Error('roomId cannot contain a @');
  if (roomId.includes(':')) throw new Error('roomId cannot contain a :');
  if (roomId.includes('/')) throw new Error('roomId cannot contain a /');
  if (roomId.includes('#')) throw new Error('roomId cannot contain a #');
  if (roomId.includes('~')) throw new Error('roomId cannot contain a ~');
};

/** @example ('roomName', 'flashcards', '@username:matrix.org')=> '#roomName~flashcards~@username:matrix.org' */
export const buildAliasFromSeed = (
  roomId: string,
  collectionKey: CollectionKey,
  userId: string
) => {
  if (!roomId) throw new Error('roomId is required');
  if (!collectionKey) throw new Error('collectionKey is required');
  if (!userId) throw new Error('userId is required');
  roomIdValidation(roomId);
  return `#${roomId}~${collectionKey}~${userId}`;
};

/** @example ('#roomName~flashcards~@username:matrix.org')=> 'roomName~flashcards~@username' */
export const getAliasNameFromAlias = (fullAlias: string) => {
  const aliasName = fullAlias.split('#')[1].split(':')[0];
  if (!aliasName) throw new Error('aliasName not found: ' + fullAlias);
  return aliasName;
};

/** @example ('#roomName~flashcards~@username:matrix.org')=> 'roomName' */
export const getroomIdFromAlias = (fullAlias: string) => {
  // all usernames are decorated with '@' in matrix. and we add a '~' to the end of the room name in `buildAliasFromSeed`
  const seed = fullAlias.split('#')[1].split('~')[0];
  if (!seed) throw new Error('roomId not found');
  return seed;
};

/** @example ('@username:matrix.org')=> '#eweser-db~registry~@username:matrix.org' */
export const buildRegistryroomId = (userId: string) => {
  return buildAliasFromSeed('eweser-db', 'registry' as CollectionKey, userId);
};

/** @example ('@username:matrix.org')=> '#eweser-db_space_username:matrix.org' */
export const buildSpaceroomId = (userId: string) => {
  return buildAliasFromSeed('eweser-db', 'space' as CollectionKey, userId);
};
