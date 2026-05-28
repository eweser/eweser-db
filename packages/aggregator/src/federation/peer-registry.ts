/**
 * Peer registry: loads and validates trusted peer configuration.
 *
 * Peers are configured via env:
 *   TRUSTED_PEERS=eweser.com|https://aggregator.eweser.com/api|secret1,peer2|https://peer2.example.com/api|secret2
 *
 * Format per peer: label|url|secret
 * Multiple peers separated by comma.
 */

import type { PeerConfig } from './types.js';

export function parsePeers(raw: string | undefined): PeerConfig[] {
  if (!raw) return [];

  return raw.split(',').map((entry, i) => {
    const parts = entry.split('|');
    if (parts.length !== 3) {
      throw new Error(
        `Invalid TRUSTED_PEERS entry #${i + 1}: expected "label|url|secret", got "${entry}"`
      );
    }
    const [label, url, secret] = parts.map((s) => s.trim());
    if (!label || !url || !secret) {
      throw new Error(
        `Invalid TRUSTED_PEERS entry #${i + 1}: label, url, and secret must be non-empty`
      );
    }
    // Validate URL
    try {
      new URL(url);
    } catch {
      throw new Error(
        `Invalid TRUSTED_PEERS entry #${i + 1}: "${url}" is not a valid URL`
      );
    }
    return { label, url, secret };
  });
}

/** Load peers from env. Cached at module scope for performance. */
let cachedPeers: PeerConfig[] | undefined;

export function loadPeers(envRaw?: string): PeerConfig[] {
  if (cachedPeers !== undefined) return cachedPeers;
  cachedPeers = parsePeers(envRaw ?? process.env.TRUSTED_PEERS);
  return cachedPeers;
}

/** Reset cache (useful for tests). */
export function resetPeerCache(): void {
  cachedPeers = undefined;
}
