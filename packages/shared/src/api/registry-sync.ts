import type { ServerRoom } from '../index.js';

export type RegistrySyncRequestBody = {
  rooms: ServerRoom[];
  /** Room IDs created locally since the last successful registry sync. */
  newRoomIds: string[];
};

export type RegistrySyncResponse = {
  rooms: ServerRoom[];
  token: string;
  userId: string;
};
