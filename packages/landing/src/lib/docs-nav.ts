/**
 * Purpose: Single source of truth for the user-facing docs navigation and the
 *   outbound links the docs pages share.
 * Exports: DOCS_NAV, DOCS_URLS.
 * Touches: Landing docs routes and the docs sidebar.
 * Read before editing: packages/landing/src/INDEX.md.
 */

export interface DocsNavItem {
  href: string;
  label: string;
}

export const DOCS_NAV: DocsNavItem[] = [
  { href: '/docs', label: 'Overview' },
  { href: '/docs/vaults-and-folders', label: 'Vaults and folders' },
  { href: '/docs/sync-and-devices', label: 'Sync and your devices' },
  { href: '/docs/local-files', label: 'Working with local files' },
  { href: '/docs/secure-vaults', label: 'Secure vaults' },
  { href: '/docs/keyboard-shortcuts', label: 'Keyboard shortcuts' },
];

export const DOCS_URLS = {
  developerDocs:
    'https://github.com/eweser/eweser-db/tree/main/packages/db#readme',
  github: 'https://github.com/eweser/eweser-db',
  note: 'https://note.eweser.com/',
} as const;
