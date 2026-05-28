/**
 * Sync-server capability metadata aligned with ADR-0010 surface.
 *
 * Returns a JSON-serializable object with server identity, version,
 * and sync-protocol capabilities. No internal env values or credentials
 * are exposed.
 */

import { readFileSync } from 'node:fs';

let _version: string | null = null;

/** Read own package version from package.json. */
export function getSyncServerVersion(): string {
  if (_version) return _version;
  try {
    const pkg = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf-8')
    ) as { version: string };
    _version = pkg.version;
  } catch {
    _version = '0.0.0';
  }
  return _version;
}

export interface SyncServerCapabilities {
  server: string;
  component: string;
  version: string;
  capabilities: {
    sync: {
      protocol: string;
      protocolVersions: number[];
      persistence: string;
      webhooks: boolean;
    };
  };
}

export function getCapabilitiesResponse(options: {
  webhooksEnabled: boolean;
}): SyncServerCapabilities {
  return {
    server: 'eweser-db',
    component: 'sync-server',
    version: getSyncServerVersion(),
    capabilities: {
      sync: {
        protocol: 'hocuspocus',
        protocolVersions: [1],
        persistence: 'sqlite',
        webhooks: options.webhooksEnabled,
      },
    },
  };
}
