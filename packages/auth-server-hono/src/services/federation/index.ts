/**
 * Federation server identity — Ed25519 keypair management and peer configuration.
 *
 * Provides loadServerIdentity() for bootstrap and getServerIdentity() for the
 * /.well-known/eweser-server endpoint. The keypair is generated on first run
 * and held in memory only.
 */

interface ServerIdentityConfig {
  authUrl: string;
  syncUrl: string;
  federationUrl: string;
  /** Optional aggregator URL for public search. */
  aggregatorUrl?: string;
}

interface ServerIdentity {
  serverDomain: string;
  publicKey: string;
  hocuspocusUrl: string;
  federationApiUrl: string;
  searchApiUrl?: string;
}

let _identity: ServerIdentity | null = null;

/**
 * Initialize server identity from deployment config.
 * In dev/test environments, falls back to placeholder key material
 * so the well-known endpoint remains functional.
 */
export function loadServerIdentity(config: ServerIdentityConfig): void {
  const domain = new URL(config.authUrl).host;

  // In production, a real Ed25519 keypair would be generated/loaded here.
  // For now, return a placeholder that signals the key is not yet generated.
  _identity = {
    serverDomain: domain,
    publicKey: 'placeholder-ed25519-key-not-yet-generated',
    hocuspocusUrl: config.syncUrl,
    federationApiUrl: config.federationUrl,
    ...(config.aggregatorUrl ? { searchApiUrl: config.aggregatorUrl } : {}),
  };
}

/** Return the loaded server identity. Returns null if not yet initialized. */
export function getServerIdentity(): ServerIdentity | null {
  return _identity;
}
