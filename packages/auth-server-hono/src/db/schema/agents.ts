import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const AGENT_TYPES = ['mcp', 'openclaw', 'custom'] as const;
export const AGENT_PERMISSIONS = ['read', 'readwrite'] as const;

/**
 * Registered AI agent configurations.
 * Each row represents one agent that a user has authorized to access their data.
 */
export const agentConfigs = pgTable('agent_configs', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** The user who owns this agent config */
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Human-readable name, e.g. "Claude Code" */
  name: text('name').notNull(),

  /** Integration type */
  type: text('type', { enum: AGENT_TYPES }).notNull().default('mcp'),

  /** MCP server endpoint or connection URL */
  endpoint: text('endpoint'),

  /** Which collections this agent can access */
  allowedCollections: text('allowed_collections').array().notNull().default([]),

  /**
   * Specific room UUIDs this agent can access.
   * Empty array = all rooms in the allowed collections.
   */
  allowedRooms: text('allowed_rooms').array().notNull().default([]),

  /** Access level */
  permissions: text('permissions', { enum: AGENT_PERMISSIONS })
    .notNull()
    .default('read'),

  /** Whether this agent token is currently valid (false = revoked) */
  isActive: boolean('is_active').notNull().default(true),

  /** Short-lived token for MCP server authentication */
  tokenHash: text('token_hash'),

  /** When the token expires (null = no expiry) */
  tokenExpiresAt: timestamp('token_expires_at', {
    withTimezone: true,
    mode: 'date',
  }),

  /** Last time this agent was used */
  lastAccessAt: timestamp('last_access_at', {
    withTimezone: true,
    mode: 'date',
  }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'date',
  }).$onUpdate(() => new Date()),
});

/**
 * Audit log for every agent access event.
 * Append-only — never updated, only inserted and (optionally) pruned by TTL.
 */
export const agentAccessLogs = pgTable('agent_access_logs', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** The agent_configs.id that performed this action */
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agentConfigs.id, { onDelete: 'cascade' }),

  /** The user who owns the data accessed */
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  /** Room UUID that was accessed */
  roomId: text('room_id').notNull(),

  /** Collection key (e.g. 'notes') */
  collectionKey: text('collection_key').notNull(),

  /** read or write */
  action: text('action', { enum: ['read', 'write'] }).notNull(),

  /** Number of documents touched */
  documentCount: integer('document_count').notNull().default(0),

  /** When this access occurred */
  accessedAt: timestamp('accessed_at', {
    withTimezone: true,
    mode: 'date',
  })
    .defaultNow()
    .notNull(),
});

export type AgentConfig = typeof agentConfigs.$inferSelect;
export type AgentConfigInsert = typeof agentConfigs.$inferInsert;
export type AgentAccessLog = typeof agentAccessLogs.$inferSelect;
export type AgentAccessLogInsert = typeof agentAccessLogs.$inferInsert;
