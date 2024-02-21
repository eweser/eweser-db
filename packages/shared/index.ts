export * from './collections';

import type { Room } from './roomsSchema';

export type LoginQueryOptions = {
  redirectUrl?: string;
  appDomain?: string;
  collections?: string[];
};

export type ServerRoom = Room;

export type RegistrySyncRequestBody = {
  rooms: ServerRoom[];
};

export type RegistrySyncResponse = {
  rooms: ServerRoom[];
  token: string;
};
