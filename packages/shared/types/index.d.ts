import type { CollectionKey, CollectionKeyOrAll } from './collections';
export * from './collections';
export * from './utils';
export type LoginQueryOptions = {
    redirect: string;
    domain: string;
    collections: CollectionKeyOrAll[];
    /** app name */
    name: string;
};
export type LoginQueryParams = {
    redirect: string;
    domain: string;
    /** CollectionOrAll array string joined with '|' */
    collections: string;
    /** app name */
    name: string;
};
/** Should match the rooms schema in the auth-server. Unfortunately we can't see the null values as undefined or else drizzle types will be out of sync. */
export type ServerRoom = {
    id: string;
    name: string;
    collectionKey: CollectionKey;
    token: string | null;
    tokenExpiry: string | null;
    ySweetUrl: string | null;
    publicAccess: 'private' | 'read' | 'write';
    readAccess: string[];
    writeAccess: string[];
    adminAccess: string[];
    createdAt: string | null;
    updatedAt: string | null;
    _deleted: boolean | null;
    _ttl: string | null;
};
export type RegistrySyncRequestBody = {
    rooms: ServerRoom[];
};
export type RegistrySyncResponse = {
    rooms: ServerRoom[];
    token: string;
};
export type RefreshYSweetTokenRouteParams = {
    roomId: string;
};
export type RefreshYSweetTokenRouteResponse = {
    token: string;
    ySweetUrl: string;
    tokenExpiry: string;
};
