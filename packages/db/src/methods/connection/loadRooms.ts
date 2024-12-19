import type { Registry } from '../../types';
import type { Database } from '../..';

/** in order not to overwhelm the requests for remote server collect, loading the server connections will be staggered with a default 1 second gap */
export const loadRooms =
  (db: Database) =>
  async (rooms: Registry, staggerMs = 1000) => {
    const loadedRooms = [];
    db.debug('loading rooms', rooms);
    for (const room of rooms) {
      const loadedRoom = await db.loadRoom(room, { loadRemote: false });
      loadedRooms.push(loadedRoom);
    }
    db.debug('loaded rooms', loadedRooms);
    db.emit('roomsLoaded', loadedRooms);
    const remoteLoadedRooms = [];
    for (const room of rooms) {
      await new Promise((resolve) => setTimeout(resolve, staggerMs));
      const remoteLoadedRoom = await db.loadRoom(room, { loadRemote: true });
      remoteLoadedRooms.push(remoteLoadedRoom);
    }
    db.debug('loaded remotes for rooms', remoteLoadedRooms);
    db.emit('roomsRemotesLoaded', remoteLoadedRooms);
  };
