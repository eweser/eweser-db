/**
 * Federated principal records for room ACLs across EweserDB servers.
 *
 * Federated principals are explicit structured records keyed by server identity
 * and remote user id — NOT parsed user@server strings. The origin server
 * (where the room lives) is authoritative for room ACL/access-grant behavior.
 *
 * When a room on server A grants access to a user on server B:
 *   - Both servers store a federated_principals record
 *   - The origin server (A) makes the final access decision
 *   - The peer server (B) stores the record so its user can see the invite
 *
 * A UNIQUE constraint on (room_id, server_domain, remote_user_id) prevents
 * duplicate invitations for the same federated identity in the same room.
 */
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { rooms } from './rooms.js';

export const INVITE_STATUSES = ['pending', 'accepted', 'revoked'] as const;

export const federatedPrincipals = pgTable('federated_principals', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** The room this federated principal has access to. */
  roomId: uuid('room_id')
    .notNull()
    .references(() => rooms.id, { onDelete: 'cascade' }),

  /** Domain of the remote server that owns the user (e.g., 'server-b.com'). */
  serverDomain: text('server_domain').notNull(),

  /** The user's ID as known on the remote server. */
  remoteUserId: text('remote_user_id').notNull(),

  /** Access level granted: read, write, or admin. */
  accessLevel: text('access_level', {
    enum: ['read', 'write', 'admin'],
  }).notNull(),

  /** The local user who issued the federated invite (null for inbound invites from peers). */
  invitedBy: uuid('invited_by').references(() => users.id),

  /** Invite lifecycle: pending → accepted, or revoked at any point. */
  inviteStatus: text('invite_status', {
    enum: INVITE_STATUSES,
  })
    .default('pending')
    .notNull(),

  grantedAt: timestamp('granted_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
    mode: 'date',
  }).$onUpdate(() => new Date()),

  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
});

/** Enforce one federated record per (room, server, user) tuple. */
export type FederatedPrincipal = typeof federatedPrincipals.$inferSelect;
export type FederatedPrincipalInsert = typeof federatedPrincipals.$inferInsert;
