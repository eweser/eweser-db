import type { Database } from '../..';
import {
  buildAliasFromSeed,
  getOrSetRoom,
  getRegistry,
  getRoomId,
  newDocument,
} from '..';
import type { Profile, RegistryData } from '../../types';
import { CollectionKey } from '../../types';

import { getAliasNameFromAlias } from './aliasHelpers';
import { createRoom } from './createRoom';

export const registryRef = 'registry.0.0';
export const publicProfileroomId = 'public';
export const privateProfileroomId = 'private';
export const defaultProfileId = 'default';

/** customSeed is used for testing to get it to create a new room */
export const populateRegistry = async (_db: Database, customSeed?: string) => {
  const logger = (message: string) =>
    _db.emit({ event: 'populateRegistry', message });
  logger('starting populateRegistry');
  const publicSeed = publicProfileroomId + (customSeed || '');
  const privateSeed = privateProfileroomId + (customSeed || '');
  const profileroomId = buildAliasFromSeed(publicSeed, 'profiles', _db.userId);

  let profileRoomId = '';
  try {
    const profileRoom = await createRoom(_db.matrixClient, {
      roomIdName: getAliasNameFromAlias(profileroomId),
      name: 'Public Profile',
      topic: 'Your public profile',
    });
    if (!profileRoom.room_id) throw new Error('failed to create profile room');
    profileRoomId = profileRoom.room_id;
    logger('created profile room');
  } catch (error: any) {
    if (
      error.message.includes('M_ROOM_IN_USE') ||
      error.message.includes('Room alias already taken')
    ) {
      logger('profile room already exists');
      const existing = await getRoomId(_db, profileroomId);
      if (existing) {
        profileRoomId = existing;
      }
    }
  }
  if (!profileRoomId) {
    throw new Error('failed to create profile room');
  }

  const privateProfileroomId = buildAliasFromSeed(
    privateSeed,
    'profiles',
    _db.userId
  );
  let privateProfileRoomId = '';
  try {
    const privateProfileRoom = await createRoom(_db.matrixClient, {
      roomIdName: getAliasNameFromAlias(privateProfileroomId),
      name: 'Private Profile',
      topic:
        'Your private profile, visible to apps you use, but not other users',
    });
    if (!privateProfileRoom.room_id)
      throw new Error('failed to create profile room');
    privateProfileRoomId = privateProfileRoom.room_id;
    logger('created private profile room');
  } catch (error: any) {
    if (
      error.message.includes('M_ROOM_IN_USE') ||
      error.message.includes('Room alias already taken')
    ) {
      logger('private profile room already exists');
      const existing = await getRoomId(_db, profileroomId);
      if (existing) {
        privateProfileRoomId = existing;
      }
    }
  }
  if (!privateProfileRoomId) {
    throw new Error('failed to create profile room');
  }
  const registryDocument = newDocument<RegistryData>(registryRef, {
    profiles: {
      [publicSeed]: {
        roomId: profileroomId,
        roomId: profileRoomId,
      },
      [privateSeed]: {
        roomId: privateProfileroomId,
        roomId: privateProfileRoomId,
      },
    },
    notes: {},
    flashcards: {},
  });
  const registry = getRegistry(_db);
  registry.set('0', registryDocument);
  logger('populated registry');

  getOrSetRoom(_db)('profiles', publicSeed);
  getOrSetRoom(_db)('profiles', privateSeed);

  // add some initial values to the profiles
  const dbRoomPublic = await _db.connectRoom<Profile>({
    roomId: publicSeed,
    collectionKey: 'profiles',
  });
  const dbRoomPrivate = await _db.connectRoom<Profile>({
    roomId: privateSeed,
    collectionKey: 'profiles',
  });
  if (typeof dbRoomPublic === 'string' || typeof dbRoomPrivate === 'string') {
    throw new Error('failed to get profile rooms from db');
  }
  const ProfilesPublic = _db.getDocuments(dbRoomPublic);
  const ProfilesPrivate = _db.getDocuments(dbRoomPrivate);
  const blankProfile = { firstName: 'New', lastName: 'User' };
  if (!ProfilesPublic.get(defaultProfileId)) {
    ProfilesPublic.new(blankProfile, defaultProfileId);
  }
  if (!ProfilesPrivate.get(defaultProfileId)) {
    ProfilesPrivate.new(blankProfile, defaultProfileId);
  }
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
  // check that public and private have been created. in the tests, we might add some randomness to them.
  const profileKeys = Object.keys(registryDocument.profiles);
  if (profileKeys?.length < 2) {
    return false;
  }
  if (!profileKeys.some((key) => key.includes(publicProfileroomId))) {
    return false;
  }

  if (!profileKeys.some((key) => key.includes(privateProfileroomId))) {
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
