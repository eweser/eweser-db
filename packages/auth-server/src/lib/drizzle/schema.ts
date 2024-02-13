import {
  pgTable,
  text,
  boolean,
  numeric,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// import { COLLECTION_KEYS } from '@eweser/db';
/**
 * @todo fix library and import these from the library
 */
export const COLLECTION_KEYS = ['notes', 'flashcards', 'profiles'] as const;
export const REQUESTER_TYPES = ['app', 'user'] as const;

export const config = pgTable('config', {
  key: text('key').primaryKey().notNull(),
  value: text('value').notNull(),
});

export const users = pgTable('users', {
  id: text('id').primaryKey().notNull(),
  authId: uuid('auth_id').notNull(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export const rooms = pgTable('rooms', {
  id: text('id').primaryKey().notNull(), // <authserver-url>|<uuid>
  name: text('name').notNull(), // user facing name of the room ('folder')
  collectionKey: text('collection_key', {
    enum: COLLECTION_KEYS,
  }).notNull(),
  token: text('token'), // y-sweet access token to sync the document
  docId: text('doc_id'), // y-sweet document id. <user_id>|<collection_key>|<room_id>
  public: boolean('public').default(false).notNull(), // if true, anyone can access the room. will invite all aggregators.

  readAccess: text('read_access').array().notNull(), // requester_id array, could be user ids or app domains
  writeAccess: text('write_access').array().notNull(), // requester_id array, could be user ids or app domains
  adminAccess: text('admin_access').array().notNull(), // requester_id array, could be user ids or app domains. Can change access and invite others.

  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});

export const accessGrants = pgTable('access_grants', {
  id: text('id').primaryKey().notNull(), // <owner_user_id>|<requester_id>
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }), // user_id
  requesterId: text('requester_id').notNull(), // requester_app_domain or requester_user_id
  requesterType: text('requester_type', {
    enum: REQUESTER_TYPES,
  }).notNull(),

  room_ids: text('room_ids').array().notNull(),
  jwtId: text('jwt_id').notNull(),
  isValid: boolean('is_valid').default(true).notNull(), // use to revoke an existing jwt
  expires: timestamp('expires', {
    withTimezone: true,
    mode: 'string',
  }).notNull(),
  keepAliveDays: numeric('keep_alive_days').default('1').notNull(), // auto renew, extend expiry date by x days every time token is used
  createdAt: timestamp('created_at', {
    withTimezone: true,
    mode: 'string',
  }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
});
