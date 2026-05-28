/**
 * Purpose: Tests for idempotent first-run room seed API.
 * Exports: Test suite covering empty-room, already-seeded, concurrent-init, and callback scenarios.
 * Touches: seedRoom.ts, room.ts, Database, Documents.
 * Read before editing: packages/db/src/utils/seedRoom.ts.
 */
import * as Y from 'yjs';
import type { TypedMap } from 'yjs-types';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../index.js';
import type { Room, EweDocument, Documents } from '../types.js';
import { seedRoom, applySeedIfNeeded } from './seedRoom.js';
import type { SeedDocuments, SeedResult } from './seedRoom.js';
import type { DocumentWithoutBase } from '@eweser/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestDoc = EweDocument & {
  title?: string;
};

function makeRoom(
  overrides: {
    ydoc?: Y.Doc | null;
    _initialDocuments?: SeedDocuments<TestDoc> | null;
    collectionKey?: string;
    id?: string;
    name?: string;
    db?: Partial<Database>;
  } = {}
): Room<TestDoc> {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ydoc: (overrides.ydoc ?? null) as any,
    _initialDocuments: overrides._initialDocuments ?? null,
    collectionKey: overrides.collectionKey ?? ('notes' as const),
    id: overrides.id ?? 'room-1',
    name: overrides.name ?? 'Test Room',
    db: {
      authServer: 'https://www.eweser.com',
      _initialDocuments: null,
      ...overrides.db,
    } as unknown as Database,
  } as unknown as Room<TestDoc>;
}

function seedDocs(count: number): DocumentWithoutBase<TestDoc>[] {
  return Array.from({ length: count }, (_, i) => ({
    title: `Seeded doc ${i + 1}`,
  }));
}

function getDocsMap(room: Room<TestDoc>): TypedMap<Documents<TestDoc>> {
  const yDoc = room.ydoc;
  if (!yDoc) throw new Error('room.ydoc is null');
  return yDoc.getMap('documents') as TypedMap<Documents<TestDoc>>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('seedRoom', () => {
  let yDoc: Y.Doc;

  beforeEach(() => {
    yDoc = new Y.Doc();
  });

  // --- empty room seed ---

  it('seeds an empty room with static documents', async () => {
    const room = makeRoom({ ydoc: yDoc });
    const seed: SeedDocuments<TestDoc> = seedDocs(2);

    const result = await seedRoom(room, seed);

    expect(result).toEqual<SeedResult>({ seeded: true, count: 2 });

    const docs = getDocsMap(room);
    expect(docs.size).toBe(2);

    const entries = Array.from(docs.values());
    expect(entries[0]?.title).toBe('Seeded doc 1');
    expect(entries[1]?.title).toBe('Seeded doc 2');
    // Metadata should be populated
    expect(entries[0]?._id).toBeTruthy();
    expect(entries[0]?._ref).toContain('|notes|room-1|');
    expect(entries[0]?._created).toBeGreaterThan(0);
    expect(entries[0]?._deleted).toBe(false);
  });

  // --- already-seeded ---

  it('skips when room already has documents (idempotent)', async () => {
    // Pre-populate the room
    const room = makeRoom({ ydoc: yDoc });
    const firstSeed: SeedDocuments<TestDoc> = [{ title: 'Original' }];
    await seedRoom(room, firstSeed);

    // Attempt a second seed with different docs
    const secondSeed: SeedDocuments<TestDoc> = [{ title: 'Should not appear' }];
    const result = await seedRoom(room, secondSeed);

    expect(result).toEqual<SeedResult>({ seeded: false, count: 0 });

    const docs = getDocsMap(room);
    expect(docs.size).toBe(1);
    expect(Array.from(docs.values())[0]?.title).toBe('Original');
  });

  // --- user-modified seeded doc ---

  it('does not overwrite user-modified seeded documents', async () => {
    const room = makeRoom({ ydoc: yDoc });
    const seed: SeedDocuments<TestDoc> = [{ title: 'Initial' }];
    await seedRoom(room, seed);

    // User modifies the doc
    const docs = getDocsMap(room);
    const entry = Array.from(docs.entries())[0];
    expect(entry).toBeDefined();
    const [docId, doc] = entry as [string, TestDoc];
    expect(docId).toBeDefined();
    yDoc.transact(() => {
      docs.set(docId, { ...doc, title: 'User modified' } as TestDoc);
    });

    // Attempt re-seed (should be skipped because room is not empty)
    const newSeed: SeedDocuments<TestDoc> = [{ title: 'Should not overwrite' }];
    const result = await seedRoom(room, newSeed);

    expect(result.seeded).toBe(false);
    expect(Array.from(getDocsMap(room).values())[0]?.title).toBe(
      'User modified'
    );
  });

  // --- concurrent initialization ---

  it('handles concurrent seed calls atomically', async () => {
    const room = makeRoom({ ydoc: yDoc });
    const seedA: SeedDocuments<TestDoc> = [{ title: 'Seed A' }];
    const seedB: SeedDocuments<TestDoc> = [{ title: 'Seed B' }];

    const [resultA, resultB] = await Promise.all([
      seedRoom(room, seedA),
      seedRoom(room, seedB),
    ]);

    // At least one should have seeded; the other should have skipped.
    const seeded = [resultA, resultB].filter((r) => r.seeded);
    expect(seeded).toHaveLength(1);
    expect(seeded[0]?.count).toBe(1);

    // Only one document should exist
    expect(getDocsMap(room).size).toBe(1);
  });

  // --- repeated init (second explicit call, same seed) ---

  it('returns seeded=false on repeated calls with same seed', async () => {
    const room = makeRoom({ ydoc: yDoc });
    const seed: SeedDocuments<TestDoc> = [{ title: 'Repeatable' }];

    const first = await seedRoom(room, seed);
    expect(first.seeded).toBe(true);

    // Call again — should skip
    const second = await seedRoom(room, seed);
    expect(second.seeded).toBe(false);
    expect(getDocsMap(room).size).toBe(1);
  });

  // --- callback seed ---

  it('supports async callback seed function', async () => {
    const room = makeRoom({ ydoc: yDoc });
    const seedCallback: SeedDocuments<TestDoc> = async (r) => {
      return [{ title: `Room: ${r.name}` }];
    };

    const result = await seedRoom(room, seedCallback);

    expect(result.seeded).toBe(true);
    expect(result.count).toBe(1);
    expect(Array.from(getDocsMap(room).values())[0]?.title).toBe(
      'Room: Test Room'
    );
  });

  // --- null ydoc ---

  it('returns seeded=false when room has no ydoc', async () => {
    const room = makeRoom({ ydoc: null });
    const seed: SeedDocuments<TestDoc> = [{ title: 'Nope' }];

    const result = await seedRoom(room, seed);
    expect(result).toEqual<SeedResult>({ seeded: false, count: 0 });
  });

  // --- empty seed array ---

  it('returns seeded=false for empty seed array', async () => {
    const room = makeRoom({ ydoc: yDoc });
    const seed: SeedDocuments<TestDoc> = [];

    const result = await seedRoom(room, seed);
    expect(result).toEqual<SeedResult>({ seeded: false, count: 0 });
  });
});

// ---------------------------------------------------------------------------
// applySeedIfNeeded (room-level + db-level)
// ---------------------------------------------------------------------------

describe('applySeedIfNeeded', () => {
  let yDoc: Y.Doc;

  beforeEach(() => {
    yDoc = new Y.Doc();
  });

  it('applies room-level seed and returns result', async () => {
    const room = makeRoom({
      ydoc: yDoc,
      _initialDocuments: [{ title: 'Room seed' }],
    });

    const result = await applySeedIfNeeded(room);

    expect(result.seeded).toBe(true);
    expect(result.count).toBe(1);
    expect(Array.from(getDocsMap(room).values())[0]?.title).toBe('Room seed');
  });

  it('falls back to db-level seed when room-level is not set', async () => {
    const room = makeRoom({
      ydoc: yDoc,
      db: {
        _initialDocuments: [{ title: 'DB seed' }] as SeedDocuments<EweDocument>,
      },
    });

    const result = await applySeedIfNeeded(room);

    expect(result.seeded).toBe(true);
    expect(result.count).toBe(1);
    expect(Array.from(getDocsMap(room).values())[0]?.title).toBe('DB seed');
  });

  it('prioritizes room-level seed over db-level seed', async () => {
    const room = makeRoom({
      ydoc: yDoc,
      _initialDocuments: [{ title: 'Room seed' }],
      db: {
        _initialDocuments: [{ title: 'DB seed' }] as SeedDocuments<EweDocument>,
      },
    });

    const result = await applySeedIfNeeded(room);

    expect(result.seeded).toBe(true);
    expect(Array.from(getDocsMap(room).values())[0]?.title).toBe('Room seed');
  });

  it('skips when room already has documents (db-level)', async () => {
    const room = makeRoom({
      ydoc: yDoc,
      db: {
        _initialDocuments: [{ title: 'DB seed' }] as SeedDocuments<EweDocument>,
      },
    });

    // Pre-populate
    await seedRoom(room, [{ title: 'Existing' }]);

    const result = await applySeedIfNeeded(room);
    expect(result.seeded).toBe(false);
  });

  it('returns seeded=false when no seed is configured', async () => {
    const room = makeRoom({ ydoc: yDoc });

    const result = await applySeedIfNeeded(room);
    expect(result).toEqual<SeedResult>({ seeded: false, count: 0 });
  });

  it('supports db-level callback seed', async () => {
    const dbSeed: SeedDocuments<EweDocument> = async (r) => {
      return [{ title: `Callback: ${r.name}` }];
    };

    const room = makeRoom({
      ydoc: yDoc,
      db: {
        _initialDocuments: dbSeed,
      },
    });

    const result = await applySeedIfNeeded(room);
    expect(result.seeded).toBe(true);
    expect(Array.from(getDocsMap(room).values())[0]?.title).toBe(
      'Callback: Test Room'
    );
  });
});
