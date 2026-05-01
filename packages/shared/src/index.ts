/**
 * Purpose: Public shared package entry point for cross-package contracts.
 * Exports: Collection, utility, API, and ServerRoom contracts.
 * Touches: SDK, auth server, sync server, aggregator, apps, and examples.
 * Read before editing: packages/shared/INDEX.md and packages/db/AGENTS.md.
 */
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
