import type { Registry } from '../../types';
import type { Database } from '../..';

export const loadRooms = (db: Database) => async (rooms: Registry) => {
  const loadedRooms = [];
  db.debug('loading rooms', rooms);
  for (const room of rooms) {
    const loadedRoom = await db.loadRoom(room);
    loadedRooms.push(loadedRoom);
  }
  db.debug('loaded rooms', loadedRooms);
  db.emit('roomsLoaded', loadedRooms);
};
