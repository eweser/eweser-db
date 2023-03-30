/** @example ('#roomName_username:matrix.org')=> 'roomName_username' */
export const truncateRoomAlias = (fullAlias: string) => {
  const truncated = fullAlias.split('#')[1].split(':')[0];
  return truncated;
};

/** @example ('#roomName_@username:matrix.org')=> 'roomName' */
export const getUndecoratedRoomAlias = (fullAlias: string) => {
  // all usernames are decorated with '@' in matrix. and we add a '~' to the end of the room name in `buildRoomAlias`
  return fullAlias.split('~@')[0].split('#')[1];
};

/** @example ('@username:matrix.org')=> '#eweser-db_registry_username:matrix.org' */
export const buildRegistryRoomAlias = (userId: string) => {
  return buildRoomAlias('eweser-db_registry_____', userId);
};

/** @example ('@username:matrix.org')=> '#eweser-db_space_username:matrix.org' */
export const buildSpaceRoomAlias = (userId: string) => {
  return buildRoomAlias('eweser-db_space______', userId);
};

/** @example ('roomName', '@username:matrix.org')=> '#roomName_username:matrix.org' */
export const buildRoomAlias = (alias: string, userId: string) => {
  // already been added
  if (alias.includes('~@')) {
    return alias;
  }
  const res = `#${alias}~${userId}`;
  return res;
};
