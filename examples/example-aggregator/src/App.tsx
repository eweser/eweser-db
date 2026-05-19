import { useCallback, useEffect, useRef, useState } from 'react';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { SignJWT } from 'jose';
import * as Y from 'yjs';

// ---------------------------------------------------------------------------
// Config — override via .env (see example.env)
// ---------------------------------------------------------------------------
const SYNC_SERVER_A =
  import.meta.env.VITE_SYNC_SERVER_A_URL ?? 'ws://localhost:38181';
const SYNC_SERVER_B =
  import.meta.env.VITE_SYNC_SERVER_B_URL ?? 'ws://localhost:38182';
const AGGREGATOR_URL =
  import.meta.env.VITE_AGGREGATOR_URL ?? 'http://localhost:38190';

// Persist room IDs across reloads so repeated visits hit the same rooms
const roomAId = localStorage.getItem('agg-demo-room-a') ?? crypto.randomUUID();
localStorage.setItem('agg-demo-room-a', roomAId);

const roomBId = localStorage.getItem('agg-demo-room-b') ?? crypto.randomUUID();
localStorage.setItem('agg-demo-room-b', roomBId);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type DocEntry = Record<string, string>;
type DocsMap = Record<string, DocEntry>;
type PublicAccess = 'private' | 'read';

type ConnectionStatus = 'connecting' | 'connected' | 'error';

type SearchResult = {
  id: string;
  roomId: string;
  collectionKey: string;
  userId: string | null;
  documentData: unknown;
  updatedAt: string;
  rank?: number;
};

// ---------------------------------------------------------------------------
// Sample seed data
// ---------------------------------------------------------------------------
const SEED_NOTES: Array<[string, string]> = [
  [
    'Mountains are beautiful',
    "Rocky peaks covered in snow remind us of nature's grandeur and majesty.",
  ],
  [
    'Oceans are deep',
    'The sea floor holds mysteries that humans are only beginning to explore and map.',
  ],
  [
    'Stars shine bright',
    'On clear nights, the Milky Way stretches across the sky in stunning detail.',
  ],
  [
    'CRDT collaboration',
    'Conflict-free replicated data types allow multiple clients to edit documents simultaneously.',
  ],
];

const SEED_FLASHCARDS: Array<[string, string]> = [
  ['What is Yjs?', 'A CRDT library for collaborative JavaScript applications.'],
  [
    'What is Hocuspocus?',
    'A Yjs WebSocket server that syncs CRDT documents in real-time across clients.',
  ],
  [
    'What is an aggregator?',
    'A service that ingests indexed CRDT documents and exposes a full-text search API.',
  ],
  [
    'What is local-first software?',
    'Applications where data lives on client devices and syncs peer-to-peer or via servers.',
  ],
];

// ---------------------------------------------------------------------------
// BackendPanel component
// ---------------------------------------------------------------------------
interface BackendPanelProps {
  label: string;
  syncUrl: string;
  roomId: string;
  collectionKey: 'notes' | 'flashcards';
}

function BackendPanel({
  label,
  syncUrl,
  roomId,
  collectionKey,
}: BackendPanelProps) {
  const [docs, setDocs] = useState<DocsMap>({});
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [newDoc, setNewDoc] = useState('');
  const [publicAccess, setPublicAccess] = useState<PublicAccess>('private');
  const ydocRef = useRef<Y.Doc | null>(null);

  useEffect(() => {
    let cancelled = false;
    let provider: HocuspocusProvider | null = null;
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const documentsMap = ydoc.getMap<DocEntry>('documents');
    const syncState = () => {
      if (!cancelled) setDocs(documentsMap.toJSON() as DocsMap);
    };
    documentsMap.observe(syncState);

    // Obtain a JWT for the sync server.
    // If VITE_DEV_SYNC_SECRET is set in the env, sign it locally in the
    // browser (no aggregator needed for sync connectivity).
    // Falls back to fetching from the aggregator /api/dev-token endpoint.
    const devSyncSecret = import.meta.env.VITE_DEV_SYNC_SECRET as
      | string
      | undefined;

    const getToken = async (): Promise<string> => {
      if (devSyncSecret) {
        const secretBytes = new TextEncoder().encode(devSyncSecret);
        return new SignJWT({ roomId, collectionKey, publicAccess })
          .setProtectedHeader({ alg: 'HS256' })
          .setExpirationTime('24h')
          .sign(secretBytes);
      }
      const r = await fetch(
        `${AGGREGATOR_URL}/api/dev-token?room=${encodeURIComponent(roomId)}&collection=${encodeURIComponent(collectionKey)}&publicAccess=${encodeURIComponent(publicAccess)}`
      );
      const data = (await r.json()) as { token?: string; error?: string };
      if (!data.token || data.error) {
        throw new Error(data.error ?? 'No token returned');
      }
      return data.token;
    };

    getToken()
      .then((token) => {
        if (cancelled) return;

        provider = new HocuspocusProvider({
          url: syncUrl,
          name: roomId,
          document: ydoc,
          token,
        });

        provider.on('authenticated', () => {
          documentsMap.set('__publicationState', {
            type: 'publication',
            publicAccess,
            updatedAt: new Date().toISOString(),
          });
          if (!cancelled) setStatus('connected');
        });
        provider.on('close', () => {
          if (!cancelled) setStatus('error');
        });
        provider.on('destroy', () => {
          documentsMap.unobserve(syncState);
        });
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
      provider?.destroy();
      ydoc.destroy();
      ydocRef.current = null;
    };
  }, [roomId, collectionKey, publicAccess, syncUrl]);

  const addDoc = useCallback(() => {
    const text = newDoc.trim();
    if (!text || !ydocRef.current) return;

    const docsMap = ydocRef.current.getMap<DocEntry>('documents');
    const id = crypto.randomUUID();

    if (collectionKey === 'notes') {
      docsMap.set(id, { type: 'note', title: text, text: '' });
    } else {
      const sep = text.indexOf('|');
      const front = sep >= 0 ? text.slice(0, sep).trim() : text;
      const back = sep >= 0 ? text.slice(sep + 1).trim() : '';
      docsMap.set(id, { type: 'flashcard', front, back });
    }
    setNewDoc('');
  }, [newDoc, collectionKey]);

  const seedDocs = useCallback(() => {
    const ydoc = ydocRef.current;
    if (!ydoc) return;
    const docsMap = ydoc.getMap<DocEntry>('documents');

    if (collectionKey === 'notes') {
      for (const [title, text] of SEED_NOTES) {
        docsMap.set(crypto.randomUUID(), { type: 'note', title, text });
      }
    } else {
      for (const [front, back] of SEED_FLASHCARDS) {
        docsMap.set(crypto.randomUUID(), { type: 'flashcard', front, back });
      }
    }
  }, [collectionKey]);

  const statusColor =
    status === 'connected'
      ? '#22c55e'
      : status === 'error'
        ? '#ef4444'
        : '#f59e0b';

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        background: '#fafafa',
      }}
    >
      <h2 style={{ margin: '0 0 8px', fontSize: '1.1em' }}>
        {label}{' '}
        <small style={{ color: '#6b7280', fontWeight: 400 }}>
          ({collectionKey})
        </small>
      </h2>

      <div
        style={{
          marginBottom: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            background: statusColor,
            color: 'white',
            padding: '1px 8px',
            borderRadius: 10,
            fontSize: '0.72em',
            fontWeight: 600,
          }}
        >
          {status}
        </span>
        <span style={{ fontSize: '0.75em', color: '#9ca3af' }}>
          room: {roomId.slice(0, 8)}…
        </span>
        <span style={{ fontSize: '0.75em', color: '#9ca3af' }}>
          {syncUrl.replace('ws://', '')}
        </span>
      </div>
      <label
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 12,
          fontSize: '0.82em',
          color: '#374151',
        }}
      >
        <input
          checked={publicAccess === 'read'}
          onChange={(event) =>
            setPublicAccess(event.target.checked ? 'read' : 'private')
          }
          type="checkbox"
        />
        Publish this room to aggregator search
      </label>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          value={newDoc}
          onChange={(e) => setNewDoc(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addDoc()}
          placeholder={
            collectionKey === 'notes' ? 'Note title…' : 'Front | Back'
          }
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontSize: '0.9em',
          }}
        />
        <button
          onClick={addDoc}
          style={{
            padding: '6px 14px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Add
        </button>
        <button
          onClick={seedDocs}
          style={{
            padding: '6px 12px',
            background: '#e5e7eb',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Seed
        </button>
      </div>

      <ul
        style={{
          margin: 0,
          paddingLeft: 18,
          maxHeight: 260,
          overflowY: 'auto',
          fontSize: '0.87em',
        }}
      >
        {Object.entries(docs)
          .filter(([id]) => !id.startsWith('__'))
          .map(([id, doc]) => (
            <li key={id} style={{ marginBottom: 5 }}>
              {collectionKey === 'notes' ? (
                <>
                  <strong>{doc['title']}</strong>
                  {doc['text'] ? (
                    <span style={{ color: '#6b7280' }}> — {doc['text']}</span>
                  ) : null}
                </>
              ) : (
                <>
                  <strong>{doc['front']}</strong>
                  {doc['back'] ? (
                    <span style={{ color: '#6b7280' }}> → {doc['back']}</span>
                  ) : null}
                </>
              )}
            </li>
          ))}
        {Object.keys(docs).filter((id) => !id.startsWith('__')).length ===
          0 && (
          <li style={{ listStyle: 'none', color: '#9ca3af' }}>
            No documents yet — click Seed or type above.
          </li>
        )}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchPanel component
// ---------------------------------------------------------------------------
interface SearchPanelProps {
  aggregatorUrl: string;
}

function SearchPanel({ aggregatorUrl }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [collection, setCollection] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q });
      if (collection.trim()) params.set('collection', collection.trim());

      const r = await fetch(`${aggregatorUrl}/api/search?${params.toString()}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as { results: SearchResult[] };
      setResults(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query, collection, aggregatorUrl]);

  return (
    <div
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: 16,
        background: '#f0f9ff',
      }}
    >
      <h2 style={{ margin: '0 0 10px', fontSize: '1.1em' }}>
        Aggregator Search
      </h2>

      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void search()}
          placeholder="Search across both backends…"
          style={{
            flex: 2,
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontSize: '0.9em',
          }}
        />
        <input
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
          placeholder="Filter by collection (optional)"
          style={{
            flex: 1,
            padding: '6px 10px',
            border: '1px solid #d1d5db',
            borderRadius: 4,
            fontSize: '0.9em',
          }}
        />
        <button
          onClick={() => void search()}
          disabled={loading}
          style={{
            padding: '6px 16px',
            background: loading ? '#93c5fd' : '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {error && (
        <p style={{ color: '#ef4444', fontSize: '0.85em', margin: '0 0 8px' }}>
          Error: {error}
        </p>
      )}

      {results.length === 0 && !loading && !error && query && (
        <p style={{ color: '#9ca3af', fontSize: '0.85em' }}>
          No results. Try seeding data on both backends first, then wait a
          moment for the aggregator webhooks to fire.
        </p>
      )}

      <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '0.87em' }}>
        {results.map((r) => (
          <li key={r.id} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span
                style={{
                  background:
                    r.collectionKey === 'notes' ? '#dbeafe' : '#ede9fe',
                  color: r.collectionKey === 'notes' ? '#1d4ed8' : '#6d28d9',
                  padding: '1px 7px',
                  borderRadius: 10,
                  fontSize: '0.78em',
                  fontWeight: 600,
                }}
              >
                {r.collectionKey}
              </span>
              {r.rank !== undefined && (
                <span style={{ fontSize: '0.75em', color: '#9ca3af' }}>
                  rank: {r.rank.toFixed(4)}
                </span>
              )}
            </div>
            <pre
              style={{
                margin: '4px 0 0',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: '#f3f4f6',
                padding: 8,
                borderRadius: 4,
                fontSize: '0.85em',
                maxHeight: 160,
                overflowY: 'auto',
              }}
            >
              {JSON.stringify(r.documentData, null, 2)}
            </pre>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root App
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        maxWidth: 1100,
        margin: '0 auto',
        padding: 24,
      }}
    >
      <h1 style={{ marginBottom: 4 }}>EweserDB Aggregator Demo</h1>
      <p style={{ color: '#6b7280', marginBottom: 24, fontSize: '0.9em' }}>
        Two independent Hocuspocus sync backends. Publish a room, click{' '}
        <strong>Seed</strong>, then search via the aggregator&#39;s full-text
        index. Private rooms are de-indexed.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <BackendPanel
          label="Backend Alpha"
          syncUrl={SYNC_SERVER_A}
          roomId={roomAId}
          collectionKey="notes"
        />
        <BackendPanel
          label="Backend Beta"
          syncUrl={SYNC_SERVER_B}
          roomId={roomBId}
          collectionKey="flashcards"
        />
      </div>

      <SearchPanel aggregatorUrl={AGGREGATOR_URL} />
    </div>
  );
}
