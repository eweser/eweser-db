/**
 * DataLayer — manages Yjs documents + Hocuspocus connections for the MCP server.
 * Uses @eweser/shared's getDocuments for CRUD operations (same as browser SDK).
 */
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

export class DataLayer {
  private rooms: Map<string, ConnectedRoom> = new Map();
  private agentConfig: AgentConfig;
  private authUrl: string;
  private agentToken: string;
  private syncUrlOverride?: string;

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
    await Promise.all(rooms.map((r) => this.connectRoom(r)));
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
    this.scheduleTokenRefresh(room.id, connected);

    // Wait for initial sync
    await this.waitForSync(provider, room.id);
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
    return connected;
  }

  assertWriteAccess(roomId: string): ConnectedRoom {
    if (this.agentConfig.permissions !== 'readwrite') {
      throw new Error('Agent does not have write permission');
    }
    return this.assertReadAccess(roomId);
  }

  // ---------------------------------------------------------------------------
  // Room listing
  // ---------------------------------------------------------------------------

  listRooms(collectionKey?: string): AgentRoom[] {
    const all = Array.from(this.rooms.values()).map((r) => r.meta);
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
