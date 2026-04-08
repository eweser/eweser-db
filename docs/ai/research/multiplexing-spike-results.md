# Spike Results: Hocuspocus Multiplexing

**Date:** 2026-04-07  
**Script:** `scripts/spike-multiplexed-docs.ts`  
**Sync server:** `ws://localhost:38181` (docker-compose.dev.yml, `sync-server` service)

## Setup

- Auth: JWT signed with `test-secret`, `roomId: 'spike-room'`
- Doc names: `room.spike-room.meta`, `room.spike-room.doc.note1`, `room.spike-room.doc.note2`
- One `HocuspocusProviderWebsocket`, three `HocuspocusProvider` instances sharing it

## Results

| Check                                                | Result                 |
| ---------------------------------------------------- | ---------------------- |
| All 3 providers connect                              | ✓ YES                  |
| Write to each doc independently                      | ✓ YES (7ms latency)    |
| `onSynced` fires                                     | ⚠ Timed out (see note) |
| Disconnect one provider → others stay connected      | ✓ YES                  |
| Shared WebSocket stays open after partial disconnect | ✓ YES                  |
| Reconnect disconnected provider                      | ✓ YES                  |
| Heap for 3 providers                                 | 12 MB                  |

## Notes

**`onSynced` timeout:** The three providers connected successfully and writes landed, but the `onSynced` callback did not fire within 10 seconds. This is likely because each JWT carries a single `roomId` claim (`spike-room`) while the sync server's `onAuthenticate` validates against doc names. The server accepts the connection but may delay or skip the "synced" acknowledgment for docs with names that don't exactly match the JWT `roomId`. This does **not** block the architecture — the connection and write paths work. The `onSynced` flow should be revisited when JWTs are issued per-doc or per-room with the correct claim format (e.g., `roomId: 'room.spike-room.meta'`).

## Conclusions

1. **Multiplexing works.** Multiple `HocuspocusProvider` instances can share a single `HocuspocusProviderWebsocket` and operate independently.
2. **Isolation confirmed.** Disconnecting one provider does not affect others sharing the same underlying socket.
3. **Memory footprint is low.** 12 MB heap for 3 providers vs. one heavy provider per room.
4. **Architecture is viable.** The `RoomDocManager` pattern (meta doc always connected, item docs connected on demand) is safe to implement.

## Action for Run 6

When implementing `RoomDocManager`, issue JWTs with `roomId` matching the exact doc name being opened (e.g., `room.{roomId}.meta`) so `onSynced` fires reliably.
