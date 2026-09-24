/**
 * Purpose: Canonical links from Ewe Note into the user-facing docs section.
 * Exports: DOCS_LINKS.
 * Touches: Contextual "Learn more" links in dialogs and settings.
 * Read before editing: packages/landing/src/lib/docs-nav.ts holds the routes.
 */

const DOCS_ORIGIN = 'https://eweser.com';

export const DOCS_LINKS = {
  keyboardShortcuts: `${DOCS_ORIGIN}/docs/keyboard-shortcuts`,
  localFiles: `${DOCS_ORIGIN}/docs/local-files`,
  secureVaults: `${DOCS_ORIGIN}/docs/secure-vaults`,
  syncAndDevices: `${DOCS_ORIGIN}/docs/sync-and-devices`,
  vaultsAndFolders: `${DOCS_ORIGIN}/docs/vaults-and-folders`,
} as const;
