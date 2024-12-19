import type { CollectionKey, PublicAccessType } from './collections';

export * from './collections';
export * from './utils';
export * from './api';

/** Should match the rooms schema in the auth-server. Unfortunately we can't see the null values as undefined or else drizzle types will be out of sync. */
export type ServerRoom = {
  id: string;
  name: string;
  collectionKey: CollectionKey;
  tokenExpiry: string | null;
  ySweetUrl: string | null;
  ySweetBaseUrl: string | null;
  publicAccess: PublicAccessType;
  readAccess: string[];
  writeAccess: string[];
  adminAccess: string[];
  createdAt: string | null;
  updatedAt: string | null;
  _deleted: boolean | null;
  _ttl: string | null;
};
