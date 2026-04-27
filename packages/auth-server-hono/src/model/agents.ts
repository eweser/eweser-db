import { and, desc, eq } from 'drizzle-orm';
import crypto from 'node:crypto';
import { db } from '../db/drizzle.js';
import type { DBInstance } from '../db/drizzle.js';
import { agentAccessLogs, agentConfigs } from '../db/schema/agents.js';
import type {
  AgentAccessLogInsert,
  AgentConfig,
  AgentConfigInsert,
} from '../db/schema/agents.js';

export type { AgentConfig } from '../db/schema/agents.js';

type AgentScopeInsert = Omit<AgentConfigInsert, 'tokenHash'>;

function uniqueStrings(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function hasExplicitScopeValues(values: string[] | undefined): boolean {
  return uniqueStrings(values).length > 0;
}

function normalizeAgentScopeInsert(insert: AgentScopeInsert): AgentScopeInsert {
  const allowedCollections = uniqueStrings(insert.allowedCollections);
  const allowedRooms = uniqueStrings(insert.allowedRooms);
  const readAllowedCollections = hasExplicitScopeValues(
    insert.readAllowedCollections
  )
    ? uniqueStrings(insert.readAllowedCollections)
    : allowedCollections;
  const readAllowedRooms = hasExplicitScopeValues(insert.readAllowedRooms)
    ? uniqueStrings(insert.readAllowedRooms)
    : allowedRooms;

  const hasExplicitWriteScope =
    hasExplicitScopeValues(insert.writeAllowedCollections) ||
    hasExplicitScopeValues(insert.writeAllowedRooms) ||
    hasExplicitScopeValues(insert.writeAllowedFolderIds) ||
    hasExplicitScopeValues(insert.writeAllowedPathPrefixes);

  const writeAllowedCollections = hasExplicitWriteScope
    ? uniqueStrings(insert.writeAllowedCollections)
    : insert.permissions === 'readwrite'
      ? allowedCollections
      : [];
  const writeAllowedRooms = hasExplicitWriteScope
    ? uniqueStrings(insert.writeAllowedRooms)
    : insert.permissions === 'readwrite'
      ? allowedRooms
      : [];

  return {
    ...insert,
    allowedCollections,
    allowedRooms,
    readAllowedCollections,
    readAllowedRooms,
    writeAllowedCollections,
    writeAllowedRooms,
    writeAllowedFolderIds: uniqueStrings(insert.writeAllowedFolderIds),
    writeAllowedPathPrefixes: uniqueStrings(insert.writeAllowedPathPrefixes),
  };
}

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

/** Generate a secure random token for an agent. Returns { token, hash }. */
export function generateAgentToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

/** Hash a raw token for DB storage / comparison. */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// Agent config CRUD
// ---------------------------------------------------------------------------

export async function createAgentConfig(
  insert: Omit<AgentConfigInsert, 'tokenHash'>,
  dbInstance?: DBInstance
): Promise<{ agentConfig: AgentConfig; token: string }> {
  const { token, hash } = generateAgentToken();
  const normalizedInsert = normalizeAgentScopeInsert(insert);

  const results = await (dbInstance ?? db)
    .insert(agentConfigs)
    .values({ ...normalizedInsert, tokenHash: hash })
    .returning();

  const agentConfig = results[0];
  if (!agentConfig) throw new Error('Failed to create agent config');

  return { agentConfig, token };
}

export async function getAgentConfigsByUserId(
  userId: string,
  dbInstance?: DBInstance
): Promise<AgentConfig[]> {
  return (dbInstance ?? db)
    .select()
    .from(agentConfigs)
    .where(eq(agentConfigs.userId, userId))
    .orderBy(desc(agentConfigs.createdAt));
}

export async function getAgentConfigById(
  id: string,
  userId: string,
  dbInstance?: DBInstance
): Promise<AgentConfig | null> {
  const results = await (dbInstance ?? db)
    .select()
    .from(agentConfigs)
    .where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId)));
  return results[0] ?? null;
}

export async function getAgentConfigByTokenHash(
  tokenHash: string,
  dbInstance?: DBInstance
): Promise<AgentConfig | null> {
  const results = await (dbInstance ?? db)
    .select()
    .from(agentConfigs)
    .where(
      and(
        eq(agentConfigs.tokenHash, tokenHash),
        eq(agentConfigs.isActive, true)
      )
    );
  return results[0] ?? null;
}

/** Revoke an agent by setting isActive=false and clearing the token hash. */
export async function revokeAgentConfig(
  id: string,
  userId: string,
  dbInstance?: DBInstance
): Promise<AgentConfig | null> {
  const results = await (dbInstance ?? db)
    .update(agentConfigs)
    .set({ isActive: false, tokenHash: null, updatedAt: new Date() })
    .where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId)))
    .returning();
  return results[0] ?? null;
}

/** Rotate the token for an agent — generates a new token and returns it. */
export async function rotateAgentToken(
  id: string,
  userId: string,
  dbInstance?: DBInstance
): Promise<{ agentConfig: AgentConfig; token: string } | null> {
  const { token, hash } = generateAgentToken();

  const results = await (dbInstance ?? db)
    .update(agentConfigs)
    .set({ tokenHash: hash, isActive: true, updatedAt: new Date() })
    .where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId)))
    .returning();

  const agentConfig = results[0];
  if (!agentConfig) return null;

  return { agentConfig, token };
}

export async function updateAgentConfigScope(
  id: string,
  userId: string,
  scope: Pick<
    AgentScopeInsert,
    | 'allowedCollections'
    | 'allowedRooms'
    | 'permissions'
    | 'readAllowedCollections'
    | 'readAllowedRooms'
    | 'writeAllowedCollections'
    | 'writeAllowedRooms'
    | 'writeAllowedFolderIds'
    | 'writeAllowedPathPrefixes'
  >,
  dbInstance?: DBInstance
): Promise<AgentConfig | null> {
  const normalizedScope = normalizeAgentScopeInsert({
    ...scope,
    endpoint: null,
    name: '',
    type: 'mcp',
    userId,
  });

  const results = await (dbInstance ?? db)
    .update(agentConfigs)
    .set({
      allowedCollections: normalizedScope.allowedCollections,
      allowedRooms: normalizedScope.allowedRooms,
      permissions: normalizedScope.permissions,
      readAllowedCollections: normalizedScope.readAllowedCollections,
      readAllowedRooms: normalizedScope.readAllowedRooms,
      updatedAt: new Date(),
      writeAllowedCollections: normalizedScope.writeAllowedCollections,
      writeAllowedFolderIds: normalizedScope.writeAllowedFolderIds,
      writeAllowedPathPrefixes: normalizedScope.writeAllowedPathPrefixes,
      writeAllowedRooms: normalizedScope.writeAllowedRooms,
    })
    .where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId)))
    .returning();

  return results[0] ?? null;
}

/** Delete an agent config permanently. */
export async function deleteAgentConfig(
  id: string,
  userId: string,
  dbInstance?: DBInstance
): Promise<boolean> {
  const results = await (dbInstance ?? db)
    .delete(agentConfigs)
    .where(and(eq(agentConfigs.id, id), eq(agentConfigs.userId, userId)))
    .returning();
  return results.length > 0;
}

/** Update lastAccessAt timestamp (called after a successful MCP tool use). */
export async function touchAgentLastAccess(
  agentId: string,
  dbInstance?: DBInstance
): Promise<void> {
  await (dbInstance ?? db)
    .update(agentConfigs)
    .set({ lastAccessAt: new Date() })
    .where(eq(agentConfigs.id, agentId));
}

// ---------------------------------------------------------------------------
// Access log
// ---------------------------------------------------------------------------

export async function logAgentAccess(
  entry: AgentAccessLogInsert,
  dbInstance?: DBInstance
): Promise<void> {
  await (dbInstance ?? db).insert(agentAccessLogs).values(entry);
}

export async function getAgentAccessLogs(
  agentId: string,
  userId: string,
  limit = 100,
  dbInstance?: DBInstance
) {
  return (dbInstance ?? db)
    .select()
    .from(agentAccessLogs)
    .where(
      and(
        eq(agentAccessLogs.agentId, agentId),
        eq(agentAccessLogs.userId, userId)
      )
    )
    .orderBy(desc(agentAccessLogs.accessedAt))
    .limit(limit);
}
