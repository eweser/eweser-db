import {
  pgTable,
  text,
  boolean,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { REQUESTER_TYPES } from '@/shared/constants';

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
