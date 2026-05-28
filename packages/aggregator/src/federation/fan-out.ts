/**
 * Federated search fan-out: queries local search first,
 * then fans out to trusted peers via signed requests.
 * Results are returned with origin labels.
 */

import type { PeerConfig, SearchResult, FederatedSearchResult } from './types.js';
import { type FederationSearchRequest, createSignedHeaders } from './request-signing.js';

/** Timeout per peer request in ms. */
const PEER_TIMEOUT_MS = 5_000;

export interface FanOutDeps {
  /** The peers to fan out to. */
  peers: PeerConfig[];
  /** Local search function. */
  localSearch: (params: {
    query: string;
    collectionKey?: string | undefined;
    limit?: number;
    offset?: number;
  }) => Promise<SearchResult[]>;
}

export interface FanOutParams {
  query: string;
  collectionKey?: string | undefined;
  limit?: number;
  offset?: number;
}

/**
 * Execute a federated search: local first, then fan out to peers.
 * Peer errors are non-fatal — they are recorded but don't fail the whole search.
 */
export async function federatedSearch(
  deps: FanOutDeps,
  params: FanOutParams
): Promise<FederatedSearchResult> {
  const { query, collectionKey, limit = 50, offset = 0 } = params;

  // 1. Local search first
  const localResults = await deps.localSearch({
    query,
    ...(collectionKey !== undefined ? { collectionKey } : {}),
    limit,
    offset,
  });

  // 2. Fan out to peers (parallel, non-fatal on individual errors)
  const peerResults = await Promise.all(
    deps.peers.map(async (peer) => {
      try {
        const results = await queryPeer(peer, {
          query,
          ...(collectionKey !== undefined ? { collectionKey } : {}),
          limit,
          offset,
        });
        return { peer: peer.label, results };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown peer error';
        const result: {
          peer: string;
          results: SearchResult[];
          error?: string;
        } = {
          peer: peer.label,
          results: [],
        };
        result.error = errorMessage;
        return result;
      }
    })
  );

  return {
    local: localResults,
    federated: peerResults,
  };
}

/** Query a single peer's search endpoint with a signed request. */
async function queryPeer(
  peer: PeerConfig,
  params: FanOutParams
): Promise<SearchResult[]> {
  const body: FederationSearchRequest = {
    query: params.query,
    timestamp: Date.now(),
  };
  if (params.collectionKey !== undefined) {
    body.collectionKey = params.collectionKey;
  }
  if (params.limit !== undefined) {
    body.limit = params.limit;
  }
  if (params.offset !== undefined) {
    body.offset = params.offset;
  }

  const headers = createSignedHeaders(body, peer.secret);
  const url = `${peer.url}/federation/search`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PEER_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(
        `Peer "${peer.label}" returned ${res.status}: ${errorText.slice(0, 200)}`
      );
    }

    const data = (await res.json()) as { results: SearchResult[] };
    return data.results ?? [];
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Peer "${peer.label}" timed out after ${PEER_TIMEOUT_MS}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Get the URL path that peers should mount to receive federation search requests. */
export const FEDERATION_SEARCH_PATH = '/federation/search';