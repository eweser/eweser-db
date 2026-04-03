#!/usr/bin/env tsx
/**
 * migrate-import.ts — Import user data into an EweserDB auth server.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-import.ts --input <export-file.json> [options]
 *
 * Options:
 *   --input <file>      Input file produced by migrate-export.ts (required)
 *   --dry-run           Print what would be imported without writing anything
 *   --user-id <uuid>    Import only a specific user from the export file
 *
 * Behaviour:
 *   - Existing users (matched by email) are updated, not duplicated
 *   - Existing rooms (matched by UUID) are updated, not duplicated
 *   - Access grants are merged (existing grants for the same owner+requester are updated)
 *
 * After importing room metadata, point your EweserDB SDK at the new sync URL:
 *   SYNC_SERVER_URL=wss://your-new-server.com/sync
 *
 * Your local IndexedDB data will sync up to the new server automatically on next connection.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as fs from 'node:fs';
import * as schema from '../packages/auth-server-hono/src/db/schema/index.js';

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const inputFile = getArg('--input');
const isDryRun = args.includes('--dry-run');
const userIdFilter = getArg('--user-id');

if (!inputFile) {
  console.error('ERROR: --input <file> is required.');
  console.error(
    'Usage: DATABASE_URL=... npx tsx scripts/migrate-import.ts --input export.json'
  );
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

type ExportUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
  rooms: Record<string, unknown>[];
  accessGrants: Record<string, unknown>[];
};

type ExportFile = {
  exportedAt: string;
  version: number;
  users: ExportUser[];
};

async function main() {
  if (!inputFile || !databaseUrl) throw new Error('Required args missing'); // validated at module level
  const raw = fs.readFileSync(inputFile, 'utf-8');
  const data = JSON.parse(raw) as ExportFile;

  if (data.version !== 1) {
    console.error(`Unsupported export version: ${data.version}. Expected: 1`);
    process.exit(1);
  }

  console.log(`Import file: ${inputFile}`);
  console.log(`Exported at: ${data.exportedAt}`);
  console.log(`Users in file: ${data.users.length}`);

  if (isDryRun) {
    console.log('\n--- DRY RUN: no changes will be written ---\n');
  }

  const usersToImport = userIdFilter
    ? data.users.filter((u) => u.id === userIdFilter)
    : data.users;

  if (usersToImport.length === 0) {
    console.warn('No matching users to import.');
    process.exit(0);
  }

  const client = postgres(databaseUrl);
  const _db = drizzle(client, { schema }); // reserved for future ORM queries

  try {
    for (const user of usersToImport) {
      console.log(`\nProcessing user: ${user.email} (${user.id})`);

      if (!isDryRun) {
        // Upsert user
        await client`
          INSERT INTO users (id, email, name, email_verified, created_at, updated_at, image, rooms)
          VALUES (
            ${user.id}::uuid,
            ${user.email},
            ${user.name},
            ${user.emailVerified},
            ${user.createdAt}::timestamptz,
            NOW(),
            NULL,
            ARRAY[]::uuid[]
          )
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            email_verified = EXCLUDED.emailVerified,
            updated_at = NOW()
        `;
        console.log(`  ✓ User upserted`);
      } else {
        console.log(`  [dry-run] Would upsert user ${user.email}`);
      }

      // Upsert rooms
      console.log(`  Importing ${user.rooms.length} rooms...`);
      for (const room of user.rooms) {
        if (!isDryRun) {
          await client`
            INSERT INTO rooms (
              id, name, collection_key, token_expiry, sync_url, sync_base_url,
              public_access, read_access, write_access, admin_access,
              created_at, updated_at, _deleted, _ttl
            )
            VALUES (
              ${room.id as string}::uuid,
              ${room.name as string},
              ${room.collectionKey as string},
              ${room.tokenExpiry as string | null}::timestamptz,
              ${room.syncUrl as string | null},
              ${room.syncBaseUrl as string | null},
              ${(room.publicAccess as string) ?? 'private'},
              ${(room.readAccess as string[]) ?? []}::text[],
              ${(room.writeAccess as string[]) ?? []}::text[],
              ${(room.adminAccess as string[]) ?? []}::text[],
              ${room.createdAt as string}::timestamptz,
              NOW(),
              ${(room._deleted as boolean) ?? false},
              ${room._ttl as string | null}::timestamptz
            )
            ON CONFLICT (id) DO UPDATE SET
              name = EXCLUDED.name,
              sync_url = EXCLUDED.sync_url,
              sync_base_url = EXCLUDED.sync_base_url,
              updated_at = NOW()
          `;
        } else {
          console.log(
            `    [dry-run] Would upsert room: ${room.name as string} (${room.id as string})`
          );
        }
      }

      if (!isDryRun && user.rooms.length > 0) {
        // Update user's rooms list
        const roomIds = user.rooms.map((r) => r.id as string);
        await client`
          UPDATE users
          SET rooms = ${roomIds}::uuid[], updated_at = NOW()
          WHERE id = ${user.id}::uuid
        `;
        console.log(`  ✓ ${user.rooms.length} rooms imported`);
      }

      // Import access grants
      console.log(`  Importing ${user.accessGrants.length} access grants...`);
      for (const grant of user.accessGrants) {
        if (!isDryRun) {
          await client`
            INSERT INTO access_grants (
              id, owner_id, requester_id, requester_type,
              room_ids, collections, is_valid, keep_alive_days,
              created_at, updated_at
            )
            VALUES (
              ${grant.id as string},
              ${user.id}::uuid,
              ${grant.requesterId as string},
              ${grant.requesterType as string},
              ${(grant.roomIds as string[]) ?? []}::text[],
              ${(grant.collections as string[]) ?? []}::text[],
              ${(grant.isValid as boolean) ?? true},
              ${(grant.keepAliveDays as number) ?? 1},
              ${grant.createdAt as string}::timestamptz,
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              room_ids = EXCLUDED.room_ids,
              collections = EXCLUDED.collections,
              is_valid = EXCLUDED.is_valid,
              updated_at = NOW()
          `;
        } else {
          console.log(
            `    [dry-run] Would upsert grant: ${grant.id as string}`
          );
        }
      }
      if (!isDryRun) {
        console.log(`  ✓ ${user.accessGrants.length} access grants imported`);
      }
    }

    if (!isDryRun) {
      console.log(
        `\nImport complete. ${usersToImport.length} user(s) imported.`
      );
      console.log(`\nNext steps:`);
      console.log(`  1. Update your SDK's sync URL to point to this server:`);
      console.log(`     SYNC_SERVER_URL=wss://your-new-server.com/sync`);
      console.log(
        `  2. Your local IndexedDB data will sync to the new server on next connection.`
      );
      console.log(
        `  3. If migrating from eweser.com, delete your data there after verifying the import.`
      );
    } else {
      console.log(
        `\n--- DRY RUN complete. Run without --dry-run to apply changes. ---`
      );
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
