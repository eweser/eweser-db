import type { CollectionKey, PublicAccessType } from './collections/index.js';

export * from './collections/index.js';
export * from './utils/index.js';
export * from './api/index.js';

/** Should match the rooms schema in the auth-server. Unfortunately we can't see the null values as undefined or else drizzle types will be out of sync. */
export type ServerRoom = {
  id: string;
  name: string;
  collectionKey: CollectionKey;
  tokenExpiry: string | null;
  syncUrl: string | null;
  publicAccess: PublicAccessType;
  readAccess: string[];
  writeAccess: string[];
  adminAccess: string[];
  createdAt: string | null;
  updatedAt: string | null;
  _deleted: boolean | null;
  _ttl: string | null;
};
