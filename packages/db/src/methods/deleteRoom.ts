import type { EweDocument } from '@eweser/shared';
import type { Database } from '../index.js';
import type { Room } from '../room.js';
import type { Registry } from '../types.js';
import { setLocalRegistry } from '../utils/localStorageService.js';

export type RoomDeletionBlockCode =
  | 'protected'
  | 'locked'
  | 'not-admin'
  | 'not-loaded'
  | 'not-empty';

export type RoomDeletionEligibility =
  | { canDelete: true; noteCount: 0 }
  | {
      canDelete: false;
      code: RoomDeletionBlockCode;
      reason: string;
      noteCount?: number;
    };

export class RoomDeletionError extends Error {
  constructor(
    readonly code: RoomDeletionBlockCode | 'rejected',
    message: string
  ) {
    super(message);
    this.name = 'RoomDeletionError';
  }
}

export function getActiveRegistryRooms(
  registry: Registry,
  initializedRoomIds: Set<string>
) {
  return registry.filter(
    (room) => !room._deleted && !initializedRoomIds.has(room.id)
  );
}

export const getRoomDeletionEligibility =
  (db: Database) =>
  <T extends EweDocument>(room: Room<T>): RoomDeletionEligibility => {
    if (db._initialRoomIds.has(room.id)) {
      return {
        canDelete: false,
        code: 'protected',
        reason: 'This vault is required by this app.',
      };
    }

    if (room.encryption && !room.isUnlocked) {
      return {
        canDelete: false,
        code: 'locked',
        reason: 'Unlock this vault before deleting it.',
      };
    }

    const registryRoom = db.registry.find((entry) => entry.id === room.id);
    const isPendingLocalRoom = db._pendingRegistryRoomIds.has(room.id);
    const isSyncedRoom =
      !isPendingLocalRoom &&
      Boolean(
        registryRoom?.syncUrl ||
        registryRoom?.adminAccess.length ||
        room.syncUrl ||
        room.adminAccess.length
      );
    const adminAccess = registryRoom?.adminAccess ?? room.adminAccess;

    if (isSyncedRoom && (!db.userId || !adminAccess.includes(db.userId))) {
      return {
        canDelete: false,
        code: 'not-admin',
        reason: 'Only a vault admin can delete this vault.',
      };
    }

    let noteCount: number;
    try {
      noteCount = room.getDocuments().getUndeletedToArray().length;
    } catch {
      return {
        canDelete: false,
        code: 'not-loaded',
        reason: 'Open this vault before deleting it.',
      };
    }

    if (noteCount > 0) {
      return {
        canDelete: false,
        code: 'not-empty',
        reason: `Move or delete its ${noteCount} note${noteCount === 1 ? '' : 's'} first.`,
        noteCount,
      };
    }

    return { canDelete: true, noteCount: 0 };
  };

export const deleteRoom =
  (db: Database) =>
  async <T extends EweDocument>(room: Room<T>) => {
    const eligibility = getRoomDeletionEligibility(db)(room);
    if (!eligibility.canDelete) {
      throw new RoomDeletionError(eligibility.code, eligibility.reason);
    }

    const registryRoom = db.registry.find((entry) => entry.id === room.id);
    if (!registryRoom) {
      throw new RoomDeletionError(
        'not-loaded',
        'This vault is not available in the local registry.'
      );
    }

    registryRoom._deleted = true;
    room._deleted = true;
    db._pendingRegistryRoomIds.delete(room.id);
    setLocalRegistry(db)(db.registry);

    room.disconnect();
    Reflect.deleteProperty(db.collections[room.collectionKey], room.id);

    try {
      await room.indexedDbProvider?.clearData();
    } catch (error) {
      db.warn('Could not clear the deleted room cache', room.id, error);
    } finally {
      room.indexedDbProvider?.destroy();
    }

    if (db.online && db.getToken()) {
      await db.syncRegistry();
      const authoritativeRoom = db.registry.find(
        (entry) => entry.id === room.id && !entry._deleted
      );
      if (authoritativeRoom) {
        throw new RoomDeletionError(
          'rejected',
          'The server did not authorize deletion of this vault.'
        );
      }
    }
  };
