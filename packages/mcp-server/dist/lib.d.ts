/**
 * Hand-written type declarations for @eweser/mcp library entry.
 * Generated automatically when tsc has enough memory; maintained manually otherwise.
 */

export interface AgentConfig {
  id: string;
  userId: string;
  name: string;
  type: 'mcp' | 'openclaw' | 'custom';
  allowedCollections: string[];
  allowedRooms: string[];
  permissions: 'read' | 'readwrite';
  isActive: boolean;
  tokenExpiresAt: string | null;
}

export interface AgentRoom {
  id: string;
  name: string;
  collectionKey: string;
  syncUrl: string | null;
  syncBaseUrl: string | null;
}

export interface SyncTokenResult {
  syncUrl: string;
  syncToken: string;
  tokenExpiry: string;
}

export declare class DataLayer {
  constructor(
    agentConfig: AgentConfig,
    authUrl: string,
    agentToken: string,
    syncUrlOverride?: string
  );
  init(rooms: AgentRoom[]): Promise<void>;
  disconnect(): Promise<void>;
  listRooms(collectionKey?: string): AgentRoom[];
  assertReadAccess(roomId: string): unknown;
  assertWriteAccess(roomId: string): unknown;
  getRawDocuments(roomId: string): Record<string, unknown>;
  getDocumentsForRoom(roomId: string): {
    get(id: string): unknown;
    set(id: string, doc: unknown): void;
    delete(id: string): void;
  };
  updateDocument(
    roomId: string,
    documentId: string,
    fields: Record<string, unknown>
  ): void;
  createDocument(
    roomId: string,
    documentId: string,
    doc: Record<string, unknown>
  ): void;
  deleteDocument(roomId: string, documentId: string): void;
  getAgentToken(): string;
}

import type { LogFn } from './tools.js';

export declare function registerTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any,
  dataLayer: DataLayer,
  log: LogFn,
  aggregatorUrl?: string
): void;

export declare function verifyAgentToken(
  token: string,
  authUrl: string
): Promise<AgentConfig>;

export declare function fetchAgentRooms(
  token: string,
  authUrl: string
): Promise<AgentRoom[]>;

export declare function fetchSyncToken(
  token: string,
  authUrl: string,
  roomId: string
): Promise<SyncTokenResult>;

export declare function logAccess(
  token: string,
  authUrl: string,
  entry: {
    roomId: string;
    collectionKey: string;
    action: 'read' | 'write';
    documentCount?: number;
  }
): Promise<void>;
