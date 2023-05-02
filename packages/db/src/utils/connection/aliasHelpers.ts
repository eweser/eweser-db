// We need to distinguish 3 kinds of 'alias' in matrix:
// 1. full room aliases: #roomName_username:matrix.org -- these we'll call `alias` in the code
// 2. the alias seed that a user will input: roomName -- these we'll call `aliasSeed` in the code
// 3. the alias seed plus eweser metadata (collection key and user name) -- these we'll call `aliasName` in the code

// `.`, `~`, `@`, and `:` must be restricted in the alias seed, because they are used to separate the alias seed from the user name and collection key in the alias name

import type { CollectionKey } from '../../types';

export const aliasSeedValidation = (aliasSeed: string) => {
  if (aliasSeed.length < 3)
    throw new Error('aliasSeed must be at least 3 characters long');
  if (aliasSeed.length > 52)
    throw new Error('aliasSeed must be less than 52 characters long');
  if (aliasSeed.includes('.'))
    throw new Error('aliasSeed cannot contain a period');
  if (aliasSeed.includes('@')) throw new Error('aliasSeed cannot contain a @');
  if (aliasSeed.includes(':')) throw new Error('aliasSeed cannot contain a :');
  if (aliasSeed.includes('/')) throw new Error('aliasSeed cannot contain a /');
  if (aliasSeed.includes('#')) throw new Error('aliasSeed cannot contain a #');
  if (aliasSeed.includes('~')) throw new Error('aliasSeed cannot contain a ~');
};

/** @example ('roomName', 'flashcards', '@username:matrix.org')=> '#roomName~flashcards~@username:matrix.org' */
export const buildAliasFromSeed = (
  aliasSeed: string,
  collectionKey: CollectionKey,
  userId: string
) => {
  if (!aliasSeed) throw new Error('aliasSeed is required');
  if (!collectionKey) throw new Error('collectionKey is required');
  if (!userId) throw new Error('userId is required');
  aliasSeedValidation(aliasSeed);
  return `#${aliasSeed}~${collectionKey}~${userId}`;
};

/** @example ('#roomName~flashcards~@username:matrix.org')=> 'roomName~flashcards~@username' */
export const getAliasNameFromAlias = (fullAlias: string) => {
  const aliasName = fullAlias.split('#')[1].split(':')[0];
  if (!aliasName) throw new Error('aliasName not found: ' + fullAlias);
  return aliasName;
};

/** @example ('#roomName~flashcards~@username:matrix.org')=> 'roomName' */
export const getAliasSeedFromAlias = (fullAlias: string) => {
  // all usernames are decorated with '@' in matrix. and we add a '~' to the end of the room name in `buildAliasFromSeed`
  const seed = fullAlias.split('#')[1].split('~')[0];
  if (!seed) throw new Error('aliasSeed not found');
  return seed;
};

/** @example ('@username:matrix.org')=> '#eweser-db~registry~@username:matrix.org' */
export const buildRegistryRoomAlias = (userId: string) => {
  return buildAliasFromSeed('eweser-db', 'registry' as CollectionKey, userId);
};

/** @example ('@username:matrix.org')=> '#eweser-db_space_username:matrix.org' */
export const buildSpaceRoomAlias = (userId: string) => {
  return buildAliasFromSeed('eweser-db', 'space' as CollectionKey, userId);
};
