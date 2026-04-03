#!/usr/bin/env tsx
/**
 * migrate-export.ts — Export all user data from an EweserDB auth server.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/migrate-export.ts [options]
 *
 * Options:
 *   --user-id <uuid>    Export a specific user (omit for all users)
 *   --output <file>     Output file path (default: eweserdb-export-<timestamp>.json)
 *   --pretty            Pretty-print JSON
 *
 * Output format:
 *   {
 *     exportedAt: ISO string,
 *     version: 1,
 *     users: [ { id, email, rooms: [...] } ]
 *   }
 *
 * Note: This exports room *metadata* from the auth server (names, access lists, sync URLs).
 *       Yjs document content is stored in the sync server (SQLite) — see the sync server
 *       export docs for full content migration.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, inArray } from 'drizzle-orm';
import * as fs from 'node:fs';
import * as schema from '../packages/auth-server-hono/src/db/schema/index.js';

const args = process.argv.slice(2);

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx !== -1 ? args[idx + 1] : undefined;
}

const userIdFilter = getArg('--user-id');
const outputFile =
  getArg('--output') ??
  `eweserdb-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
const pretty = args.includes('--pretty');

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL environment variable is required.');
  process.exit(1);
}

async function main() {
  const client = postgres(databaseUrl!);
  const db = drizzle(client, { schema });

  try {
    console.log('Connecting to database...');

    // Fetch users
    const allUsers = userIdFilter
      ? await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, userIdFilter))
      : await db.select().from(schema.users);

    if (allUsers.length === 0) {
      console.warn(userIdFilter ? `No user found with id: ${userIdFilter}` : 'No users found.');
      process.exit(0);
    }

    console.log(`Exporting ${allUsers.length} user(s)...`);

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: 1,
      users: [] as object[],
    };

    for (const user of allUsers) {
      const userRoomIds = (user.rooms as string[]) ?? [];

      // Fetch all rooms the user has access to
      const roomResults =
        userRoomIds.length > 0
          ? await db
              .select()
              .from(schema.rooms)
              .where(inArray(schema.rooms.id, userRoomIds))
          : [];

      // Fetch access grants for this user
      const grants = await db
        .select()
        .from(schema.accessGrants)
        .where(eq(schema.accessGrants.ownerId, user.id));

      exportData.users.push({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        rooms: roomResults,
        accessGrants: grants,
      });

      console.log(
        `  ✓ User ${user.email} — ${(roomResults as unknown[]).length} rooms, ${grants.length} grants`
      );
    }

    const json = pretty
      ? JSON.stringify(exportData, null, 2)
      : JSON.stringify(exportData);

    fs.writeFileSync(outputFile, json, 'utf-8');
    console.log(`\nExport complete → ${outputFile}`);
    console.log(
      `  Total users: ${exportData.users.length}`
    );
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Export failed:', err);
  process.exit(1);
});
