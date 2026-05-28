export {
  type SearchResult,
  type PeerConfig,
  type PeerSearchResponse,
  type FederatedSearchResult,
} from './types.js';

export { parsePeers, loadPeers, resetPeerCache } from './peer-registry.js';

export {
  type FederationSearchRequest,
  signRequest,
  createSignedHeaders,
  verifySignature,
} from './request-signing.js';

export {
  type FanOutDeps,
  type FanOutParams,
  federatedSearch,
  FEDERATION_SEARCH_PATH,
} from './fan-out.js';