export * from './collections';
export * from './roomsSchema';
import type { Room } from './roomsSchema';

export type LoginQueryOptions = {
  redirect: string;
  domain: string;
  collections: string[];
};

export type LoginQueryParams = {
  redirect: string;
  domain: string;
  /** collections array string joined with '|' */
  collections: string;
};

export type ServerRoom = Room &
  Partial<{
    token: Room['token'];
    ySweetUrl: Room['ySweetUrl'];
    _deleted: Room['_deleted'];
    _ttl: Room['_ttl'];
  }>;

export type RegistrySyncRequestBody = {
  rooms: ServerRoom[];
};

export type RegistrySyncResponse = {
  rooms: ServerRoom[];
  token: string;
};
