import type { ServerRoom } from '../index.js';

export type RegistrySyncRequestBody = {
  rooms: ServerRoom[];
};

export type RegistrySyncResponse = {
  rooms: ServerRoom[];
  token: string;
  userId: string;
};
