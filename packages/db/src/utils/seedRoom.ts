/**
 * Purpose: Idempotent first-run room seed helper.
 * Exports: seedRoom and SeedDocuments type.
 * Touches: Y.Doc document map — CRDT-safe writes via transact().
 * Read before editing: packages/db/AGENTS.md.
 */
import type { TypedMap } from 'yjs-types';
import {
  newDocument,
  buildRef,
  type DocumentWithoutBase,
  type EweDocument,
  type Documents,
} from '@eweser/shared';
import type { Database } from '../index.js';
import type { Room } from '../room.js';
import type { SeedDocuments, SeedResult } from './seedTypes.js';

export type { SeedDocuments, SeedResult };

/**
 * Apply seed documents to a room's Y.Doc iff the room has no existing documents.
 *
 * Idempotency: checks `documents.size === 0` before writing, so reloads,
 * reconnects, and concurrent calls never overwrite existing data. All writes
 * happen inside a single Yjs `transact()` for CRDT atomicity.
 *
 * @returns { seeded: true, count: N } when seed ran; { seeded: false, count: 0 } otherwise.
 */
export async function seedRoom<T extends EweDocument>(
  room: Room<T>,
  seed: SeedDocuments<T>
): Promise<SeedResult> {
  if (!room.ydoc) return { seeded: false, count: 0 };

  const documents = room.ydoc.getMap('documents') as TypedMap<Documents<T>>;

  // Idempotency: only seed an empty room.
  if (documents.size > 0) return { seeded: false, count: 0 };

  const resolvedDocs =
    typeof seed === 'function' ? await seed(room, room.db) : seed;

  if (!resolvedDocs || resolvedDocs.length === 0)
    return { seeded: false, count: 0 };

  let count = 0;

  room.ydoc.transact(() => {
    for (const doc of resolvedDocs) {
      const documentId = crypto.randomUUID();
      const ref = buildRef({
        authServer: room.db.authServer,
        collectionKey: room.collectionKey,
        roomId: room.id,
        documentId,
      });
      const seededDoc = newDocument(documentId, ref, doc);
      documents.set(documentId, seededDoc as T);
      count++;
    }
  });

  return { seeded: true, count };
}

/**
 * Internal: apply a resolved document array to a room's Y.Doc.
 * Callers must check idempotency before calling.
 * Accepts EweDocument (not generic T) for db-level seeds where the
 * seed type doesn't match the room's document type parameter.
 */
function writeSeedDocs(
  room: Room<EweDocument>,
  resolvedDocs: DocumentWithoutBase<EweDocument>[]
): number {
  const yDoc = room.ydoc;
  if (!yDoc) throw new Error('room.ydoc is null');
  const documents = yDoc.getMap('documents') as TypedMap<
    Documents<EweDocument>
  >;
  let count = 0;

  yDoc.transact(() => {
    for (const doc of resolvedDocs) {
      const documentId = crypto.randomUUID();
      const ref = buildRef({
        authServer: room.db.authServer,
        collectionKey: room.collectionKey,
        roomId: room.id,
        documentId,
      });
      const seededDoc = newDocument(documentId, ref, doc);
      documents.set(documentId, seededDoc as EweDocument);
      count++;
    }
  });

  return count;
}

/**
 * Apply any configured seed (room-level then db-level) to a room.
 * Convenience wrapper used in loadRoom.
 */
export async function applySeedIfNeeded<T extends EweDocument>(
  room: Room<T>
): Promise<SeedResult> {
  // Room-level seed takes priority.
  if (room._initialDocuments) {
    return seedRoom(room, room._initialDocuments);
  }

  // Fall back to database-level seed.
  const db = room.db;
  if (db._initialDocuments) {
    return seedRoomDbLevel(room, db);
  }

  return { seeded: false, count: 0 };
}

/**
 * Apply database-level seed to a room. Accepts raw Room<T> + Database and
 * avoids the generic mismatch between Room<T> and SeedDocuments<EweDocument>.
 */
async function seedRoomDbLevel<T extends EweDocument>(
  room: Room<T>,
  db: Database
): Promise<SeedResult> {
  if (!room.ydoc) return { seeded: false, count: 0 };

  const documents = room.ydoc.getMap('documents') as TypedMap<Documents<T>>;
  if (documents.size > 0) return { seeded: false, count: 0 };

  const seed = db._initialDocuments;
  if (!seed) return { seeded: false, count: 0 };
  const resolvedDocs: DocumentWithoutBase<EweDocument>[] =
    typeof seed === 'function'
      ? await seed(room as unknown as Room<EweDocument>, db)
      : seed;

  if (!resolvedDocs || resolvedDocs.length === 0)
    return { seeded: false, count: 0 };

  const count = writeSeedDocs(
    room as unknown as Room<EweDocument>,
    resolvedDocs
  );

  return { seeded: true, count };
}
