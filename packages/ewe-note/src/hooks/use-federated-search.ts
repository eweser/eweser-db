/**
 * Federated search hook for Ewe Note.
 *
 * Queries the aggregator API and returns structured results with local
 * and federated sections. Federated peer failures degrade gracefully
 * — the peer is listed with an error message, not the entire search.
 */

import { useState, useCallback, useRef } from 'react';
import { AGGREGATOR_URL } from '@/config';

// ---------------------------------------------------------------------------
// Types matching the aggregator's /api/search response
// ---------------------------------------------------------------------------

export interface SearchResult {
  id: string;
  roomId: string;
  collectionKey: string;
  userId: string | null;
  documentData: Record<string, unknown>;
  updatedAt: string;
  rank?: number;
}

export interface FederatedPeerResult {
  peer: string;
  results: SearchResult[];
  error?: string;
}

export interface SearchResponse {
  results: SearchResult[];
  federated?: FederatedPeerResult[];
}

export interface SearchState {
  query: string;
  localResults: SearchResult[];
  federatedResults: FederatedPeerResult[];
  loading: boolean;
  error: string | null;
  searched: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract a human-readable title from documentData. */
export function getDocumentTitle(doc: SearchResult): string {
  const data = doc.documentData ?? {};
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    if (typeof d.title === 'string' && d.title) return d.title;
    if (typeof d.front === 'string' && d.front) return d.front;
    if (typeof d.name === 'string' && d.name) return d.name;
    if (typeof d.text === 'string' && d.text) return d.text.slice(0, 80);
  }
  return 'Untitled';
}

/** Extract a short snippet from documentData. */
export function getDocumentSnippet(doc: SearchResult): string {
  const data = doc.documentData ?? {};
  if (typeof data === 'object' && data !== null) {
    const d = data as Record<string, unknown>;
    const text = typeof d.text === 'string' ? d.text : '';
    const back = typeof d.back === 'string' ? d.back : '';
    const snippet = text || back;
    if (snippet)
      return snippet.length > 120 ? `${snippet.slice(0, 120)}…` : snippet;
  }
  return '';
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useFederatedSearch() {
  const [state, setState] = useState<SearchState>({
    query: '',
    localResults: [],
    federatedResults: [],
    loading: false,
    error: null,
    searched: false,
  });

  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    const trimmed = q.trim();
    setState((prev) => ({ ...prev, query: trimmed }));

    if (!trimmed) {
      setState({
        query: trimmed,
        localResults: [],
        federatedResults: [],
        loading: false,
        error: null,
        searched: false,
      });
      return;
    }

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState((prev) => ({
      ...prev,
      query: trimmed,
      loading: true,
      error: null,
    }));

    try {
      const params = new URLSearchParams({ q: trimmed, limit: '50' });
      const r = await fetch(
        `${AGGREGATOR_URL}/api/search?${params.toString()}`,
        { signal: controller.signal }
      );

      if (!r.ok) {
        throw new Error(`Search request failed (HTTP ${r.status})`);
      }

      const data = (await r.json()) as SearchResponse;

      setState({
        query: trimmed,
        localResults: data.results ?? [],
        federatedResults: data.federated ?? [],
        loading: false,
        error: null,
        searched: true,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return; // Silently ignore aborted requests
      }
      setState({
        query: trimmed,
        localResults: [],
        federatedResults: [],
        loading: false,
        error: err instanceof Error ? err.message : 'Search failed',
        searched: true,
      });
    }
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setState({
      query: '',
      localResults: [],
      federatedResults: [],
      loading: false,
      error: null,
      searched: false,
    });
  }, []);

  return { ...state, search, clear };
}
