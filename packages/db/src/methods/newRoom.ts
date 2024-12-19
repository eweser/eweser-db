import type { EweDocument } from '@eweser/shared';
import type { Database } from '..';
import type { NewRoomOptions } from '../room';
import { Room, roomToServerRoom } from '../room';
import { setLocalRegistry } from '../utils/localStorageService';

type NewRoomHelperOptions<T extends EweDocument> = Omit<
  NewRoomOptions<T>,
  'db'
>;

export const newRoom =
  (db: Database) =>
  /**
   * new rooms must be added to the registry and then synced with the auth server
   * Note: If your app does not have access privileges to the collection, the room won't be synced server-side.
   */
  <T extends EweDocument>(options: NewRoomHelperOptions<T>) => {
    const room = new Room<T>({ db, ...options });
    db.debug('new room', room);
    db.collections[options.collectionKey][room.id] = room as Room<any>;

    const registryRoom = roomToServerRoom(room);
    db.registry.push(registryRoom);
    setLocalRegistry(db)(db.registry);

    db.loadRoom(room);

    if (db.online) {
      db.syncRegistry();
    } else {
      // const online = checkOnline();
      // if(online){
      //   this.syncRegistry()
      // }
    }

    return room;
  };
