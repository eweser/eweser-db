---
name: eweser-yjs-debug
description: >
  Use this skill to debug Yjs CRDT issues in the EweserDB SDK. Covers Y.Doc
  state inspection, provider connection troubleshooting, sync conflicts, and
  common patterns for diagnosing why data is not persisting or syncing.
---

# Role: EweserDB Yjs Debugger

You diagnose and fix Yjs CRDT issues in the EweserDB SDK.

## Architecture reminder

```text
Y.Doc
  -> documents: Y.Map<DocumentId, DocumentObject>
       -> Each doc: plain JS object stored as a Yjs map value
```

Providers:

- `IndexeddbPersistence`: local storage with `y-indexeddb`.
- `HocuspocusProvider`: remote sync over WebSocket.
- `WebrtcProvider`: peer-to-peer when present.

## Inspecting Y.Doc state

```typescript
const ydoc: Y.Doc = room.ydoc;
const docsMap = ydoc.getMap('documents');

docsMap.forEach((value, key) => {
  console.log(key, value);
});

console.log('doc count:', docsMap.size);

const stateVector = Y.encodeStateVector(ydoc);
const fullUpdate = Y.encodeStateAsUpdate(ydoc);
console.log('state size bytes:', fullUpdate.byteLength);
```

## Common issues

### Data not persisting after page reload

1. Confirm `IndexeddbPersistence` initialized before writes:

   ```typescript
   await room.indexedDbProvider?.whenSynced;
   ```

2. Check the IndexedDB database name in browser DevTools.
3. Look for `y-indexeddb` errors in the console.

### Data not syncing between clients

1. Check `room.connectionStatus`; it should be `'connected'`.
2. Verify the sync token has not expired.
3. Check WebSocket connection state in browser DevTools.
4. Check auth claims match the expected room, user, and collection.

### Two clients show different data

Yjs CRDTs are conflict-free by design. Divergence usually means:

- Clients are connecting to different rooms.
- One client has stale local state.
- A local write has not propagated yet.

To force a local merge in a test or debug harness:

```typescript
Y.applyUpdate(localDoc, remoteUpdate);
```

### Direct mutation bug

Wrong:

```typescript
const doc = docs.get(id);
doc.text = 'new value';
```

Right:

```typescript
const doc = docs.get(id);
docs.set({ ...doc, text: 'new value' });
```

### Debugging provider events

```typescript
room.syncProvider?.on('status', ({ status }) => {
  console.log('sync status:', status);
});

room.syncProvider?.on('authenticationFailed', ({ reason }) => {
  console.error('auth failed:', reason);
});

room.indexedDbProvider?.on('synced', () => {
  console.log('indexeddb synced');
});
```

## Test patterns

```typescript
const doc1 = new Y.Doc();
const doc2 = new Y.Doc();

doc1.on('update', (update) => Y.applyUpdate(doc2, update));
doc2.on('update', (update) => Y.applyUpdate(doc1, update));

doc1.getMap('a').set('key', 'value');
assert(doc2.getMap('a').get('key') === 'value');
```
