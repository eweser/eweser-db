import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db/drizzle.js';
import type { DBInstance } from '../db/drizzle.js';
import {
  backupSnapshots,
  type BackupSnapshot,
} from '../db/schema/backup_snapshots.js';

export type BackupSnapshotInsert = typeof backupSnapshots.$inferInsert;

type SnapshotScope = {
  accessGrantId?: string | null | undefined;
  userId: string;
};

function actorScopeWhere(scope: SnapshotScope) {
  const clauses = [eq(backupSnapshots.userId, scope.userId)];
  if (scope.accessGrantId) {
    clauses.push(eq(backupSnapshots.accessGrantId, scope.accessGrantId));
  }
  return and(...clauses);
}

export async function insertBackupSnapshot(
  insert: BackupSnapshotInsert,
  dbInstance?: DBInstance
): Promise<BackupSnapshot> {
  const result = await (dbInstance ?? db)
    .insert(backupSnapshots)
    .values(insert)
    .returning();
  const snapshot = result[0];
  if (!snapshot) {
    throw new Error('Failed to create backup snapshot');
  }
  return snapshot;
}

export async function listBackupSnapshots(
  scope: SnapshotScope,
  dbInstance?: DBInstance
): Promise<BackupSnapshot[]> {
  return await (dbInstance ?? db)
    .select()
    .from(backupSnapshots)
    .where(actorScopeWhere(scope))
    .orderBy(desc(backupSnapshots.createdAt));
}

export async function getBackupSnapshotForActor(
  params: SnapshotScope & { id: string },
  dbInstance?: DBInstance
): Promise<BackupSnapshot | null> {
  const results = await (dbInstance ?? db)
    .select()
    .from(backupSnapshots)
    .where(and(eq(backupSnapshots.id, params.id), actorScopeWhere(params)));
  return results[0] ?? null;
}
