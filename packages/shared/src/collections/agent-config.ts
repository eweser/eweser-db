import type { DocumentBase } from './documentBase';

/** Permissions granted to an AI agent for accessing EweserDB collections. */
export type AgentConfigBase = {
  /** Human-readable name for this agent (e.g. "Claude Code", "My Local Agent") */
  name: string;
  /** The type of agent integration */
  type: 'mcp' | 'openclaw' | 'custom';
  /** The MCP server endpoint or connection URL (optional for local agents) */
  endpoint?: string;
  /** Which collections this agent can access, e.g. ['notes', 'bookmarks'] */
  allowedCollections: string[];
  /**
   * Specific room UUIDs this agent can access.
   * Empty array means all rooms in the allowed collections.
   */
  allowedRooms?: string[];
  /** Read-only or full read-write access */
  permissions: 'read' | 'readwrite';
  /** Unix timestamp (ms) when the agent token expires. Undefined = no expiry. */
  tokenExpiresAt?: number;
};

export type AgentConfig = DocumentBase & AgentConfigBase;

/** A single entry in the audit log for an agent access event. */
export type AgentAccessLogEntryBase = {
  /** The _id of the AgentConfig that made this access */
  agentId: string;
  /** The room UUID that was accessed */
  roomId: string;
  /** The collection key that was accessed (e.g. 'notes') */
  collectionKey: string;
  /** Whether this was a read or write operation */
  action: 'read' | 'write';
  /** Number of documents read or written in this operation */
  documentCount: number;
  /** Unix timestamp (ms) of the access */
  timestamp: number;
};

export type AgentAccessLogEntry = DocumentBase & AgentAccessLogEntryBase;
