import type { UpdateRoomPostBody, UpdateRoomResponse } from '@eweser/shared';
import type { Database } from '../index.js';
import type { EweDocument, Room } from '../types.js';
import { setLocalRegistry } from '../utils/localStorageService.js';

export const renameRoom =
  (db: Database) => async (room: Room<EweDocument>, newName: string) => {
    const body: UpdateRoomPostBody = {
      newName,
    };
    const { data, error } = await db.serverFetch<UpdateRoomResponse>(
      `/api/access-grant/update-room/${room.id}`,
      {
        method: 'POST',
        body,
      }
    );
    if (error) {
      db.error('Error renaming room', error);
    } else if (data?.name) {
      room.name = data.name;
      db.debug('Room renamed', data);
      const registryEntry = db.registry.find((r) => r.id === room.id);
      if (registryEntry) {
        registryEntry.name = data.name;
        setLocalRegistry(db)(db.registry);
      } else {
        db.error('Error renaming room, registry entry not found');
      }
    }

    return data;
  };
