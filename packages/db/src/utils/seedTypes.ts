/**
 * Purpose: Lightweight seed types shared between room.ts and seedRoom.ts.
 * Exports: SeedDocuments, SeedResult types.
 * Touches: room.ts, seedRoom.ts, Database.
 * Read before editing: packages/db/src/room.ts.
 */
import type { EweDocument, DocumentWithoutBase } from '@eweser/shared';
import type { Database } from '../index.js';
import type { Room } from '../room.js';

/**
 * Documents to seed a room with — either a static array or a callback
 * that receives the room (for contextual seed generation).
 */
export type SeedDocuments<T extends EweDocument> =
  | DocumentWithoutBase<T>[]
  | ((
      room: Room<T>,
      db: Database
    ) => DocumentWithoutBase<T>[] | Promise<DocumentWithoutBase<T>[]>);

export interface SeedResult {
  /** Whether any documents were actually written. */
  seeded: boolean;
  /** Number of documents written. */
  count: number;
}
