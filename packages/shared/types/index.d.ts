export * from './collections';
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
export type ServerRoom = {
    id: string;
    name: string;
    collectionKey: 'notes' | 'flashcards' | 'profiles';
    token?: string | null;
    ySweetUrl?: string | null;
    publicAccess: 'private' | 'read' | 'write';
    readAccess: string[];
    writeAccess: string[];
    adminAccess: string[];
    createdAt: string;
    updatedAt: string | null;
    _deleted?: boolean;
    _ttl?: string | null;
};
export type RegistrySyncRequestBody = {
    rooms: ServerRoom[];
};
export type RegistrySyncResponse = {
    rooms: ServerRoom[];
    token: string;
};
