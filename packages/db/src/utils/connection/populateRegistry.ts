import type { Database } from '../../';
import { buildAliasFromSeed, getRegistry, newDocument } from '../';
import type { RegistryData } from '../../types';
import { CollectionKey } from '../../types';

import { getAliasNameFromAlias } from './aliasHelpers';
import { createRoom } from './createRoom';

export const registryRef = 'registry.0.0';
export const publicProfileAliasSeed = 'public';

/** customSeed is used for testing to get it to create a new room */
export const populateRegistry = async (_db: Database, customSeed?: string) => {
  const logger = (message: string) =>
    _db.emit({ event: 'populateRegistry', message });
  logger('starting populateRegistry');

  const profileRoomAlias = buildAliasFromSeed(
    customSeed ?? publicProfileAliasSeed,
    CollectionKey.profiles,
    _db.userId
  );
  const profileRoom = await createRoom(_db.matrixClient, {
    roomAliasName: getAliasNameFromAlias(profileRoomAlias),
    name: 'Public Profile',
    topic: 'Your public profile',
  });
  if (!profileRoom.room_id) throw new Error('failed to create profile room');
  logger('created profile room');

  const registryDocument = newDocument<RegistryData>(registryRef, {
    profiles: {
      public: {
        roomAlias: profileRoomAlias,
        roomId: profileRoom.room_id,
      },
    },
    notes: {},
    flashcards: {},
  });
  const registry = getRegistry(_db);
  registry.set('0', registryDocument);
  logger('populated registry');
};

export const checkRegistryPopulated = (_db: Database) => {
  const registry = getRegistry(_db);
  if (registry.size === 0) {
    return false;
  }
  const registryDocument = registry.get('0');
  if (!registryDocument) {
    return false;
  }

  if (!registryDocument.profiles.public) {
    return false;
  }

  return true;
};

/** wait 5 seconds total by default before failing */
export const waitForRegistryPopulated = async (
  _db: Database,
  maxWaitMs = 5000,
  tryInterval = 200
) => {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const check = () => {
      if (checkRegistryPopulated(_db)) {
        resolve(true);
      } else {
        if (tries > maxWaitMs / tryInterval) {
          reject(new Error('timed out waiting for registry to populate'));
        }
        tries++;
        setTimeout(check, tryInterval);
      }
    };
    check();
  });
};
