import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * OAuth 2.0 client registrations.
 * First-party clients (e.g. ChatGPT) are seeded via migration.
 */
export const oauthClients = pgTable('oauth_clients', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** Public client identifier (sent as client_id in OAuth flows) */
  clientId: text('client_id').notNull().unique(),

  /** Human-readable client name */
  clientName: text('client_name').notNull(),

  /** Allowed redirect URIs as JSON array string */
  redirectUris: text('redirect_uris').array().notNull().default([]),

  /** First-party clients skip the consent page */
  isFirstParty: boolean('is_first_party').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

/**
 * Short-lived authorization codes (PKCE).
 * Exchanged for access tokens at POST /oauth/token; valid for 5 minutes.
 */
export const oauthCodes = pgTable('oauth_codes', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** SHA-256 hex of the plaintext code */
  codeHash: text('code_hash').notNull().unique(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  clientId: text('client_id').notNull(),

  /** PKCE S256 code challenge sent by the client */
  codeChallenge: text('code_challenge').notNull(),

  /** Must be "S256" */
  codeChallengeMethod: text('code_challenge_method').notNull().default('S256'),

  /** The redirect_uri the code was issued for */
  redirectUri: text('redirect_uri').notNull(),

  /** Requested permission scopes (space-separated) */
  scopes: text('scopes').notNull().default('read'),

  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),

  /** Null until redeemed; once set the code cannot be reused */
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

/**
 * Long-lived OAuth access tokens.
 * Stored as a SHA-256 hash; the plaintext is only returned once.
 */
export const oauthAccessTokens = pgTable('oauth_access_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),

  /** SHA-256 hex of the plaintext bearer token */
  tokenHash: text('token_hash').notNull().unique(),

  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  clientId: text('client_id').notNull(),

  /** Space-separated scopes granted */
  scopes: text('scopes').notNull().default('read'),

  /** Null = never expires */
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),

  /** Set when the token is revoked */
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .defaultNow()
    .notNull(),
});

export type OAuthClient = typeof oauthClients.$inferSelect;
export type OAuthCode = typeof oauthCodes.$inferSelect;
export type OAuthAccessToken = typeof oauthAccessTokens.$inferSelect;
