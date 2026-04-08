/**
 * Spike: Validate Hocuspocus multiplexing
 *
 * Tests that multiple HocuspocusProvider instances can share a single
 * HocuspocusProviderWebsocket and sync independently.
 *
 * Usage:
 *   SYNC_SERVER_URL=ws://localhost:1234 ROOM_TOKEN=... npx tsx scripts/spike-multiplexed-docs.ts
 *
 * Note: Requires the sync server to have auth disabled or a valid JWT in ROOM_TOKEN.
 * For the spike, start the sync server with AUTH_DISABLED=true in docker-compose.dev.yml.
 */

import * as Y from 'yjs';
import {
  HocuspocusProviderWebsocket,
  HocuspocusProvider,
} from '@hocuspocus/provider';

const SYNC_URL = process.env.SYNC_SERVER_URL ?? 'ws://localhost:1234';
const TOKEN = process.env.ROOM_TOKEN ?? 'spike-test-token';

const DOC_NAMES = [
  'room.spike-room.meta',
  'room.spike-room.doc.note1',
  'room.spike-room.doc.note2',
];

interface ProviderEntry {
  name: string;
  doc: Y.Doc;
  provider: HocuspocusProvider;
  connected: boolean;
  syncedAt?: number;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5000
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function main() {
  console.log(`\n=== Hocuspocus Multiplexing Spike ===`);
  console.log(`Sync URL: ${SYNC_URL}`);
  console.log('');

  // 1. Create shared WebSocket singleton
  console.log('1. Creating shared WebSocket...');
  const sharedSocket = new HocuspocusProviderWebsocket({ url: SYNC_URL });
  console.log('   ✓ Shared WebSocket created');

  // 2. Create 3 providers on the same socket
  console.log('\n2. Creating 3 providers on shared socket...');
  const entries: ProviderEntry[] = DOC_NAMES.map((name) => {
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      websocketProvider: sharedSocket,
      name,
      document: doc,
      token: TOKEN,
      onConnect: () => {
        const entry = entries.find((e) => e.name === name);
        if (entry) entry.connected = true;
        console.log(`   ✓ Connected: ${name}`);
      },
      onSynced: () => {
        const entry = entries.find((e) => e.name === name);
        if (entry) entry.syncedAt = Date.now();
        console.log(`   ✓ Synced: ${name}`);
      },
      onDisconnect: () => {
        const entry = entries.find((e) => e.name === name);
        if (entry) entry.connected = false;
        console.log(`   ✗ Disconnected: ${name}`);
      },
    });
    return { name, doc, provider, connected: false };
  });

  // 3. Wait for all to sync (timeout 10s)
  console.log('\n3. Waiting for all providers to sync...');
  try {
    await waitFor(() => entries.every((e) => e.syncedAt !== undefined), 10000);
    console.log('   ✓ All providers synced');
  } catch {
    console.log(
      '   ⚠ Timed out — server may require auth. Continuing with connected check...'
    );
  }

  // 4. Write data to each doc independently
  console.log('\n4. Writing data to each doc...');
  const t0 = Date.now();
  for (const entry of entries) {
    const map = entry.doc.getMap<string>('test');
    entry.doc.transact(() => {
      map.set('key', `value-from-${entry.name}-at-${Date.now()}`);
    });
    console.log(`   ✓ Wrote to: ${entry.name}`);
  }
  console.log(`   Write latency: ${Date.now() - t0}ms`);

  // 5. Disconnect one provider and verify others stay connected
  console.log('\n5. Disconnecting note1 provider...');
  const note1Entry = entries[1];
  note1Entry.provider.disconnect();

  await new Promise((r) => setTimeout(r, 500));

  const otherEntries = entries.filter((e) => e.name !== note1Entry.name);
  const othersStillConnected = otherEntries.every((e) => e.connected);
  console.log(`   Shared socket status: ${sharedSocket.status}`);
  console.log(
    `   Meta doc connected: ${entries[0].connected} — expected: true`
  );
  console.log(
    `   Note2 doc connected: ${entries[2].connected} — expected: true`
  );
  console.log(
    `   Others still connected: ${othersStillConnected ? '✓ YES' : '✗ NO'}`
  );

  // 6. Check WebSocket is still open (not closed by disconnecting one provider)
  const socketStillOpen = sharedSocket.status === 'connected';
  console.log(
    `\n6. Shared WebSocket still open after partial disconnect: ${socketStillOpen ? '✓ YES' : '✗ NO'}`
  );

  // 7. Reconnect note1
  console.log('\n7. Reconnecting note1...');
  note1Entry.provider.connect();
  await new Promise((r) => setTimeout(r, 1000));
  console.log(`   note1 connected: ${note1Entry.connected}`);

  // 8. Memory/connection summary
  console.log('\n8. Summary:');
  console.log(`   Docs open: ${entries.length}`);
  console.log(`   Providers: ${entries.length}`);
  console.log(`   WebSocket connections: 1 (shared)`);
  console.log(
    `   Process memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB heap`
  );

  // Cleanup
  console.log('\n9. Cleanup...');
  for (const entry of entries) {
    entry.provider.destroy();
  }
  sharedSocket.destroy();
  console.log('   ✓ All providers and socket destroyed');

  console.log('\n=== Spike complete ===\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Spike failed:', err);
  process.exit(1);
});
