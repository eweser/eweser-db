/**
 * Federation types shared across the aggregator federation module.
 */

/** A search result from any origin (local or peer). */
export interface SearchResult {
  id: string;
  roomId: string;
  collectionKey: string;
  userId: string | null;
  documentData: unknown;
  updatedAt: Date;
}

/** A trusted federated peer definition. */
export interface PeerConfig {
  /** Human-readable label shown in results (e.g. "eweser.com"). */
  label: string;
  /** Base URL of the peer's aggregator search endpoint. */
  url: string;
  /** Shared secret for HMAC-signed federation requests. */
  secret: string;
}

/** Shape of the federated search response from a peer. */
export interface PeerSearchResponse {
  results: SearchResult[];
  total: number;
}

/** Shape of the internal fan-out result. */
export interface FederatedSearchResult {
  local: SearchResult[];
  federated: Array<{
    peer: string;
    results: SearchResult[];
    error?: string;
  }>;
}
