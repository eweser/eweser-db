// We need to distinguish 3 kinds of 'alias' in matrix:
// 1. full room aliases: #roomName_username:matrix.org -- these we'll call `alias` in the code
// 2. the alias seed that a user will input: roomName -- these we'll call `aliasSeed` in the code
// 3. the alias seed plus eweser metadata (collection key and user name) -- these we'll call `aliasName` in the code

// `~`, `@`, and `:` must be restricted in the alias seed, because they are used to separate the alias seed from the user name and collection key in the alias name

import { CollectionKey } from '../types';

/** @example ('roomName', 'flashcards', '@username:matrix.org')=> '#roomName~flashcards~@username:matrix.org' */
export const buildAliasFromSeed = (
  aliasSeed: string,
  collectionKey: CollectionKey,
  userId: string
) => {
  if (aliasSeed.length > 24) {
    throw new Error('aliasSeed must be less than 24 characters');
  }
  // already been added
  if (
    aliasSeed.includes('~') ||
    aliasSeed.includes('@') ||
    aliasSeed.includes(':')
  ) {
    throw new Error('aliasSeed cannot contain ~, @, or :');
  }
  const res = `#${aliasSeed}~${collectionKey}~${userId}`;
  return res;
};

/** @example ('#roomName~flashcards~@username:matrix.org')=> 'roomName~flashcards~@username' */
export const getAliasNameFromAlias = (fullAlias: string) => {
  const truncated = fullAlias.split('#')[1].split(':')[0];
  return truncated;
};

/** @example ('#roomName~flashcards~@username:matrix.org')=> 'roomName' */
export const getAliasSeedFromAlias = (fullAlias: string) => {
  // all usernames are decorated with '@' in matrix. and we add a '~' to the end of the room name in `buildRoomAlias`
  return fullAlias.split('#')[1].split('~')[0];
};

/** @example ('@username:matrix.org')=> '#eweser-db~registry~@username:matrix.org' */
export const buildRegistryRoomAlias = (userId: string) => {
  return buildAliasFromSeed('eweser-db', CollectionKey.registry, userId);
};

/** @example ('@username:matrix.org')=> '#eweser-db_space_username:matrix.org' */
export const buildSpaceRoomAlias = (userId: string) => {
  return buildAliasFromSeed('eweser-db', 'space' as any, userId);
};
