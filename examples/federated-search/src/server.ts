/**
 * Federated Search Micro-Example
 *
 * Simulates two EweserDB aggregator peers demonstrating federated public search.
 *
 * Peer A (port 3091): Has local indexed documents. Fans out search to Peer B.
 * Peer B (port 3092): Has its own indexed documents. Responds to federation requests.
 *
 * Both peers use a simple in-memory search index and HMAC-signed federation.
 *
 * Usage:
 *   npm run dev
 *   Open http://localhost:3091/ in a browser to try federated search.
 */

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createHmac } from 'node:crypto';

// ── Shared secret for inter-peer trust ────────────────────────────────
const SHARED_SECRET = 'demo-shared-secret-for-federated-search';

// ── In-memory indexed documents (simulating full-text search) ─────────

interface IndexedDoc {
  id: string;
  title: string;
  content: string;
  roomId: string;
  collectionKey: string;
  userId: string;
}

const peerADocuments: IndexedDoc[] = [
  {
    id: 'a-1',
    title: 'Local Weather Report',
    content: 'The weather forecast for the week shows sunny skies and mild temperatures across the region.',
    roomId: 'room-a-1',
    collectionKey: 'notes',
    userId: 'alice',
  },
  {
    id: 'a-2',
    title: 'Meeting Notes: Q2 Planning',
    content: 'Discussed Q2 product roadmap including federation features and public search enhancements.',
    roomId: 'room-a-1',
    collectionKey: 'notes',
    userId: 'alice',
  },
];

const peerBDocuments: IndexedDoc[] = [
  {
    id: 'b-1',
    title: 'Federated Search Design Doc',
    content: 'Architecture proposal for federated public search across EweserDB peers with signed requests.',
    roomId: 'room-b-1',
    collectionKey: 'notes',
    userId: 'bob',
  },
  {
    id: 'b-2',
    title: 'Weather Tracking System',
    content: 'The new weather tracking system will aggregate data from multiple peer servers across regions.',
    roomId: 'room-b-1',
    collectionKey: 'notes',
    userId: 'bob',
  },
];

// ── Simple full-text matcher ──────────────────────────────────────────

function simpleSearch(
  docs: IndexedDoc[],
  query: string,
  collectionKey?: string,
  limit = 50,
  offset = 0
) {
  const terms = query.toLowerCase().split(/\s+/);
  let filtered = collectionKey
    ? docs.filter((d) => d.collectionKey === collectionKey)
    : docs;

  const scored = filtered
    .map((doc) => {
      const contentLower = `${doc.title} ${doc.content}`.toLowerCase();
      const score = terms.reduce(
        (sum, term) => sum + (contentLower.includes(term) ? 1 : 0),
        0
      );
      return { doc, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(offset, offset + limit).map(({ doc }) => ({
    id: doc.id,
    roomId: doc.roomId,
    collectionKey: doc.collectionKey,
    userId: doc.userId,
    documentData: { title: doc.title, content: doc.content },
    updatedAt: new Date().toISOString(),
  }));
}

// ── Federation signing helpers ────────────────────────────────────────

function signRequest(body: Record<string, unknown>, secret: string): string {
  return createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
}

// ── Peer B: Federation-enabled aggregator ─────────────────────────────

const peerB = new Hono();

peerB.get('/health', (c) => c.json({ status: 'ok', peer: 'B' }));

// Federation search endpoint (receives signed requests from trusted peers)
peerB.post('/api/federation/search', async (c) => {
  const sig = c.req.header('X-Eweser-Federation-Signature');
  if (!sig) return c.json({ error: 'Missing federation signature' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid request body' }, 400);
  }

  const expected = signRequest(body, SHARED_SECRET);
  if (sig !== expected) {
    return c.json({ error: 'Invalid federation signature' }, 403);
  }

  const query = (body.query as string) ?? '';
  const collectionKey = body.collectionKey as string | undefined;
  const limit = (body.limit as number) ?? 50;
  const offset = (body.offset as number) ?? 0;

  const results = simpleSearch(peerBDocuments, query, collectionKey, limit, offset);

  return c.json({ results, total: results.length }, 200);
});

// ── Peer A: Main peer that fans out to Peer B ─────────────────────────

const peerA = new Hono();

peerA.get('/health', (c) => c.json({ status: 'ok', peer: 'A' }));

// Search endpoint: local first, then federated to Peer B
peerA.get('/api/search', async (c) => {
  const query = c.req.query('q')?.trim();
  const collectionKey = c.req.query('collection')?.trim() || undefined;

  if (!query) {
    return c.json({ error: 'Missing required query parameter: q' }, 400);
  }

  // 1. Local search
  const localResults = simpleSearch(peerADocuments, query, collectionKey, 25);

  // 2. Federated fan-out to Peer B
  let federated: Array<{
    peer: string;
    results: ReturnType<typeof simpleSearch>;
    error?: string;
  }> = [];

  try {
    const body = {
      query,
      collectionKey,
      limit: 25,
      offset: 0,
      timestamp: Date.now(),
    };
    const sig = signRequest(body, SHARED_SECRET);

    const res = await fetch('http://localhost:3092/api/federation/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Eweser-Federation-Signature': sig,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        results: ReturnType<typeof simpleSearch>;
        total: number;
      };
      federated.push({ peer: 'Peer B (localhost:3092)', results: data.results });
    } else {
      const errorText = await res.text();
      federated.push({
        peer: 'Peer B (localhost:3092)',
        results: [],
        error: `Peer returned ${res.status}: ${errorText.slice(0, 200)}`,
      });
    }
  } catch (err) {
    federated.push({
      peer: 'Peer B (localhost:3092)',
      results: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }

  return c.json({ local: localResults, federated }, 200);
});

// ── Serve HTML demo page ──────────────────────────────────────────────

peerA.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Federated Search Demo — EweserDB</title>
  <style>
    :root { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
    h1 { font-size: 1.5rem; }
    .search-box { display: flex; gap: 0.5rem; margin: 1.5rem 0; }
    .search-box input { flex: 1; padding: 0.5rem; font-size: 1rem; border: 1px solid #ccc; border-radius: 4px; }
    .search-box button { padding: 0.5rem 1rem; font-size: 1rem; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; }
    .section { margin: 1rem 0; }
    .section h2 { font-size: 1.1rem; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; }
    .local h2 { background: #dbeafe; color: #1e40af; }
    .federated h2 { background: #fef3c7; color: #92400e; }
    .error-marker { background: #fee2e2; color: #991b1b; padding: 0.5rem; border-radius: 4px; margin-bottom: 0.5rem; }
    .result { border-left: 3px solid #e5e7eb; padding: 0.5rem 1rem; margin: 0.5rem 0; }
    .result h3 { margin: 0 0 0.25rem 0; font-size: 1rem; }
    .result p { margin: 0; color: #6b7280; font-size: 0.9rem; }
    .meta { font-size: 0.8rem; color: #9ca3af; margin-top: 0.25rem; }
    .empty { color: #9ca3af; font-style: italic; }
  </style>
</head>
<body>
  <h1>EweserDB Federated Search Demo</h1>
  <p>
    Peer A (this server) searches its local index, then fans out to <strong>Peer B</strong> via a signed federation request.
    Results are shown with origin labels.
  </p>
  <div class="search-box">
    <input id="query" type="text" placeholder="Search (e.g. weather, federation)…" value="weather" />
    <button onclick="doSearch()">Search</button>
  </div>
  <div id="results"></div>

  <script>
    async function doSearch() {
      const q = document.getElementById('query').value.trim();
      const container = document.getElementById('results');
      if (!q) { container.innerHTML = '<p class="empty">Enter a search query.</p>'; return; }

      container.innerHTML = '<p>Searching…</p>';
      try {
        const res = await fetch('/api/search?q=' + encodeURIComponent(q));
        const data = await res.json();
        let html = '';

        // Local results
        html += '<div class="section local"><h2>Local Results (Peer A)</h2>';
        if (data.local && data.local.length > 0) {
          for (const r of data.local) {
            html += '<div class="result">';
            html += '<h3>' + escapeHtml(r.documentData?.title || '(untitled)') + '</h3>';
            html += '<p>' + escapeHtml((r.documentData?.content || '').slice(0, 150)) + '</p>';
            html += '<span class="meta">' + escapeHtml(r.id) + ' &middot; ' + escapeHtml(r.collectionKey) + '</span>';
            html += '</div>';
          }
        } else {
          html += '<p class="empty">No local results.</p>';
        }
        html += '</div>';

        // Federated results
        for (const peer of (data.federated || [])) {
          html += '<div class="section federated"><h2>Federated: ' + escapeHtml(peer.peer) + '</h2>';
          if (peer.error) {
            html += '<div class="error-marker">Error: ' + escapeHtml(peer.error) + '</div>';
          }
          if (peer.results && peer.results.length > 0) {
            for (const r of peer.results) {
              html += '<div class="result">';
              html += '<h3>' + escapeHtml(r.documentData?.title || '(untitled)') + '</h3>';
              html += '<p>' + escapeHtml((r.documentData?.content || '').slice(0, 150)) + '</p>';
              html += '<span class="meta">' + escapeHtml(r.id) + ' &middot; ' + escapeHtml(r.collectionKey) + '</span>';
              html += '</div>';
            }
          } else {
            html += '<p class="empty">No results from this peer.</p>';
          }
          html += '</div>';
        }

        container.innerHTML = html;
      } catch (err) {
        container.innerHTML = '<p class="error-marker">Search failed: ' + escapeHtml(String(err)) + '</p>';
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.appendChild(document.createTextNode(text));
      return div.innerHTML;
    }

    // Search on load
    doSearch();
  </script>
</body>
</html>`);
});

// ── Start both servers ─────────────────────────────────────────────────

serve({ fetch: peerA.fetch, port: 3091 });
console.log('Peer A running at http://localhost:3091');

serve({ fetch: peerB.fetch, port: 3092 });
console.log('Peer B running at http://localhost:3092');