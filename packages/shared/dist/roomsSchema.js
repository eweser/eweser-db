import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { COLLECTION_KEYS, PUBLIC_ACCESS_TYPES } from './index';
export const rooms = pgTable('rooms', {
    id: uuid('id').primaryKey().notNull(),
    name: text('name').notNull(),
    collectionKey: text('collection_key', {
        enum: COLLECTION_KEYS,
    }).notNull(),
    token: text('token'),
    ySweetUrl: text('y_sweet_url'),
    publicAccess: text('public_access', { enum: PUBLIC_ACCESS_TYPES })
        .default('private')
        .notNull(),
    readAccess: text('read_access').array().notNull(),
    writeAccess: text('write_access').array().notNull(),
    adminAccess: text('admin_access').array().notNull(),
    createdAt: timestamp('created_at', {
        withTimezone: true,
        mode: 'string',
    }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }),
    _deleted: boolean('_deleted').default(false),
    _ttl: timestamp('_ttl', { withTimezone: true, mode: 'string' }),
});
//# sourceMappingURL=roomsSchema.js.map