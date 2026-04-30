/**
 * DataLayer — manages Yjs documents + Hocuspocus connections for the MCP server.
 * Uses @eweser/shared's getDocuments for CRUD operations (same as browser SDK).
 */
import { posix as posixPath } from 'node:path';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import type { AgentConfig, AgentRoom, SyncTokenResult } from './auth.js';
import { fetchSyncToken } from './auth.js';
import { createLogger } from '@eweser/logger';

const log = createLogger('mcp-server').child({ component: 'data-layer' });
import {
  getDocuments,
  getRoomDocuments,
  type GetDocuments,
  type Documents,
  type EweDocument,
  type CollectionKey,
} from '@eweser/shared';

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry
const SYNC_WAIT_TIMEOUT_MS = 30_000;

interface ConnectedRoom {
  meta: AgentRoom;
  ydoc: Y.Doc;
  provider: HocuspocusProvider;
  syncToken: string;
  tokenExpiry: Date;
  refreshTimer?: ReturnType<typeof setTimeout>;
}

type DocumentWriteCandidate = Partial<EweDocument> & {
  folderIds?: unknown;
  sourcePath?: unknown;
};

export class DataLayer {
  private rooms: Map<string, ConnectedRoom> = new Map();
  private agentConfig: AgentConfig;
  private authUrl: string;
  private agentToken: string;
  private syncUrlOverride: string | undefined;

  constructor(
    agentConfig: AgentConfig,
    authUrl: string,
    agentToken: string,
    syncUrlOverride?: string
  ) {
    this.agentConfig = agentConfig;
    this.authUrl = authUrl;
    this.agentToken = agentToken;
    this.syncUrlOverride = syncUrlOverride;
  }

  /** Connect to all provided rooms and wait for initial sync. */
  async init(rooms: AgentRoom[]): Promise<void> {
    const results = await Promise.all(
      rooms.map(async (room) => {
        try {
          await this.connectRoom(room);
          return { room, result: { status: 'fulfilled' as const } };
        } catch (reason) {
          return { room, result: { status: 'rejected' as const, reason } };
        }
      })
    );
    const failures = results.filter(
      (entry): entry is { room: AgentRoom; result: PromiseRejectedResult } =>
        entry.result.status === 'rejected'
    );

    if (failures.length > 0) {
      log.warn(
        {
          failedRoomCount: failures.length,
          roomCount: rooms.length,
          roomIds: failures.map(({ room }) => room.id),
        },
        '[eweser-mcp] Failed to connect one or more rooms; continuing with accessible rooms'
      );
    }

    if (rooms.length > 0 && failures.length === rooms.length) {
      const failureDetails = failures
        .map(
          ({ room, result }) => `${room.id}: ${getErrorMessage(result.reason)}`
        )
        .join('; ');
      throw new AggregateError(
        failures.map(({ result }) => result.reason),
        `[eweser-mcp] Failed to connect any rooms: ${failureDetails}`
      );
    }
  }

  /** Connect a single room: fetch sync token, create Y.Doc + HocuspocusProvider. */
  async connectRoom(room: AgentRoom): Promise<void> {
    const tokenResult = await fetchSyncToken(
      this.agentToken,
      this.authUrl,
      room.id
    );

    const ydoc = new Y.Doc();
    const syncUrl = this.syncUrlOverride
      ? `${this.syncUrlOverride}/${room.id}`
      : tokenResult.syncUrl;

    const provider = new HocuspocusProvider({
      url: syncUrl,
      name: room.id,
      document: ydoc,
      token: tokenResult.syncToken,
    });

    const connected: ConnectedRoom = {
      meta: room,
      ydoc,
      provider,
      syncToken: tokenResult.syncToken,
      tokenExpiry: new Date(tokenResult.tokenExpiry),
    };

    this.rooms.set(room.id, connected);

    // Wait for initial sync
    try {
      await this.waitForSync(provider, room.id);
    } catch (err) {
      clearTimeout(connected.refreshTimer);
      provider.disconnect();
      provider.destroy();
      this.rooms.delete(room.id);
      throw err;
    }

    this.scheduleTokenRefresh(room.id, connected);
  }

  private waitForSync(
    provider: HocuspocusProvider,
    roomId: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`[eweser-mcp] Timed out waiting for sync: ${roomId}`));
      }, SYNC_WAIT_TIMEOUT_MS);

      provider.on('synced', ({ state }: { state: boolean }) => {
        if (state) {
          clearTimeout(timer);
          resolve();
        }
      });

      // If already synced
      if ((provider as unknown as { isSynced?: boolean }).isSynced) {
        clearTimeout(timer);
        resolve();
      }
    });
  }

  private scheduleTokenRefresh(roomId: string, connected: ConnectedRoom): void {
    const msUntilRefresh =
      connected.tokenExpiry.getTime() - Date.now() - TOKEN_REFRESH_BUFFER_MS;

    if (msUntilRefresh <= 0) {
      void this.refreshToken(roomId);
      return;
    }

    connected.refreshTimer = setTimeout(
      () => void this.refreshToken(roomId),
      msUntilRefresh
    );
  }

  private async refreshToken(roomId: string): Promise<void> {
    const connected = this.rooms.get(roomId);
    if (!connected) return;

    try {
      const result: SyncTokenResult = await fetchSyncToken(
        this.agentToken,
        this.authUrl,
        roomId
      );
      if (this.rooms.get(roomId) !== connected) return;
      connected.syncToken = result.syncToken;
      connected.tokenExpiry = new Date(result.tokenExpiry);
      connected.provider.setConfiguration({ token: result.syncToken });
      this.scheduleTokenRefresh(roomId, connected);
    } catch (err) {
      log.error(
        { err, roomId },
        `[eweser-mcp] Failed to refresh token for room ${roomId}`
      );
    }
  }

  /** Disconnect a single room and clean up. */
  disconnectRoom(roomId: string): void {
    const connected = this.rooms.get(roomId);
    if (!connected) return;
    clearTimeout(connected.refreshTimer);
    connected.provider.disconnect();
    connected.provider.destroy();
    this.rooms.delete(roomId);
  }

  /** Disconnect all rooms. */
  async disconnect(): Promise<void> {
    for (const roomId of this.rooms.keys()) {
      this.disconnectRoom(roomId);
    }
  }

  // ---------------------------------------------------------------------------
  // Permission helpers
  // ---------------------------------------------------------------------------

  assertReadAccess(roomId: string): ConnectedRoom {
    const connected = this.rooms.get(roomId);
    if (!connected) {
      throw new Error(`Room not connected or not accessible: ${roomId}`);
    }
    if (!this.canReadRoom(connected)) {
      throw new Error(
        `Agent does not have read permission for room: ${roomId}`
      );
    }
    return connected;
  }

  assertWriteAccess(
    roomId: string,
    document?: DocumentWriteCandidate
  ): ConnectedRoom {
    const connected = this.assertReadAccess(roomId);
    if (!this.canWriteRoom(connected)) {
      throw new Error('Agent does not have write permission');
    }
    if (
      connected.meta.collectionKey === 'notes' &&
      !this.canWriteNoteDocument(document)
    ) {
      throw new Error(
        'Agent does not have write permission for this note folder or path'
      );
    }
    return connected;
  }

  private canReadRoom(connected: ConnectedRoom): boolean {
    const collections = effectiveReadScope(
      this.agentConfig.readAllowedCollections,
      this.agentConfig.allowedCollections
    );
    const rooms = effectiveReadScope(
      this.agentConfig.readAllowedRooms,
      this.agentConfig.allowedRooms
    );

    return (
      scopeIncludes(collections, connected.meta.collectionKey) &&
      scopeIncludes(rooms, connected.meta.id)
    );
  }

  private getReadableRooms(): ConnectedRoom[] {
    return Array.from(this.rooms.values()).filter((connected) =>
      this.canReadRoom(connected)
    );
  }

  private canWriteRoom(connected: ConnectedRoom): boolean {
    const writeScope = getWriteScope(this.agentConfig);

    if (!writeScope.explicit) {
      if (this.agentConfig.permissions !== 'readwrite') return false;
      return (
        scopeIncludes(
          this.agentConfig.allowedCollections,
          connected.meta.collectionKey
        ) && scopeIncludes(this.agentConfig.allowedRooms, connected.meta.id)
      );
    }

    if (writeScope.collections.length === 0 && writeScope.rooms.length === 0) {
      return false;
    }

    return (
      scopeIncludes(writeScope.collections, connected.meta.collectionKey) &&
      scopeIncludes(writeScope.rooms, connected.meta.id)
    );
  }

  private canWriteNoteDocument(document?: DocumentWriteCandidate): boolean {
    const writeScope = getWriteScope(this.agentConfig);
    const allowedFolderIds = writeScope.folderIds;
    const allowedPathPrefixes = writeScope.pathPrefixes;

    if (allowedFolderIds.length === 0 && allowedPathPrefixes.length === 0) {
      return true;
    }

    if (!document) return false;

    return (
      noteHasAllowedFolder(document, allowedFolderIds) ||
      noteHasAllowedPath(document, allowedPathPrefixes)
    );
  }

  // ---------------------------------------------------------------------------
  // Room listing
  // ---------------------------------------------------------------------------

  listRooms(collectionKey?: string): AgentRoom[] {
    const all = this.getReadableRooms().map((r) => r.meta);
    if (!collectionKey) return all;
    return all.filter((r) => r.collectionKey === collectionKey);
  }

  // ---------------------------------------------------------------------------
  // Document CRUD (delegates to @eweser/shared's getDocuments)
  // ---------------------------------------------------------------------------

  getDocumentsForRoom<T extends EweDocument>(roomId: string): GetDocuments<T> {
    const connected = this.assertReadAccess(roomId);
    return getDocuments(
      this.authUrl,
      connected.meta.collectionKey as CollectionKey,
      roomId
    )<T>(connected.ydoc);
  }

  getRawDocuments<T extends EweDocument>(roomId: string): Documents<T> {
    const connected = this.assertReadAccess(roomId);
    return getRoomDocuments<T>(connected.ydoc).toJSON() as Documents<T>;
  }

  /** Return the agent bearer token (used by tools to call external services on behalf of the agent). */
  getAgentToken(): string {
    return this.agentToken;
  }

  // ---------------------------------------------------------------------------
  // Search
  // ---------------------------------------------------------------------------

  searchDocuments(
    query: string,
    collectionKey?: string
  ): Array<{ roomId: string; collectionKey: string; doc: EweDocument }> {
    const results: Array<{
      roomId: string;
      collectionKey: string;
      doc: EweDocument;
    }> = [];
    const targetRooms = this.listRooms(collectionKey);

    const lowerQuery = query.toLowerCase();

    for (const room of targetRooms) {
      const docs = this.getRawDocuments(room.id);
      for (const doc of Object.values(docs)) {
        if (!doc || (doc as { _deleted?: boolean })._deleted) continue;
        const text = JSON.stringify(doc).toLowerCase();
        if (text.includes(lowerQuery)) {
          results.push({
            roomId: room.id,
            collectionKey: room.collectionKey,
            doc,
          });
        }
      }
    }

    return results;
  }
}

function compactScope(values: string[] | undefined): string[] {
  return Array.from(new Set((values ?? []).filter(Boolean)));
}

function effectiveReadScope(
  nextScope: string[] | undefined,
  legacyScope: string[]
): string[] {
  const next = compactScope(nextScope);
  return next.length > 0 ? next : compactScope(legacyScope);
}

function scopeIncludes(scope: string[], value: string): boolean {
  return scope.length === 0 || scope.includes(value);
}

function getErrorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function getWriteScope(agentConfig: AgentConfig): {
  explicit: boolean;
  collections: string[];
  rooms: string[];
  folderIds: string[];
  pathPrefixes: string[];
} {
  const collections = compactScope(agentConfig.writeAllowedCollections);
  const rooms = compactScope(agentConfig.writeAllowedRooms);
  const folderIds = compactScope(agentConfig.writeAllowedFolderIds);
  const pathPrefixes = compactScope(agentConfig.writeAllowedPathPrefixes);
  const explicit =
    collections.length > 0 ||
    rooms.length > 0 ||
    folderIds.length > 0 ||
    pathPrefixes.length > 0 ||
    agentConfig.permissions !== 'readwrite';

  return { explicit, collections, rooms, folderIds, pathPrefixes };
}

function noteHasAllowedFolder(
  document: DocumentWriteCandidate,
  allowedFolderIds: string[]
): boolean {
  if (allowedFolderIds.length === 0) return false;
  if (!Array.isArray(document.folderIds)) return false;
  return document.folderIds.some(
    (folderId) =>
      typeof folderId === 'string' && allowedFolderIds.includes(folderId)
  );
}

function noteHasAllowedPath(
  document: DocumentWriteCandidate,
  allowedPathPrefixes: string[]
): boolean {
  if (allowedPathPrefixes.length === 0) return false;
  if (typeof document.sourcePath !== 'string') return false;

  const sourcePath = normalizePathForScope(document.sourcePath);
  if (!sourcePath) return false;

  return allowedPathPrefixes.some((prefix) => {
    const normalizedPrefix = normalizePathForScope(prefix);
    return normalizedPrefix
      ? pathMatchesPrefix(sourcePath, normalizedPrefix)
      : false;
  });
}

function normalizePathForScope(value: string): string | null {
  const cleaned = value.trim().replace(/\\/g, '/');
  if (!cleaned) return null;
  if (posixPath.isAbsolute(cleaned)) return null;
  if (cleaned.split('/').includes('..')) return null;

  const normalized = posixPath.normalize(cleaned);
  if (
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    posixPath.isAbsolute(normalized)
  ) {
    return null;
  }
  return normalized;
}

function pathMatchesPrefix(sourcePath: string, prefix: string): boolean {
  if (!prefix) return false;
  if (prefix.endsWith('/')) return sourcePath.startsWith(prefix);
  return sourcePath === prefix || sourcePath.startsWith(`${prefix}/`);
}
