# Ewe Note CLI

## Plain English

This folder contains command-line tools for importing, exporting, and syncing
Obsidian-compatible vault data with Ewe Note data shapes.

## Owns

- Vault import manifest generation from Markdown files and attachments.
- Vault export from manifests back to Markdown files.
- Local state-file sync experiments for vault workflows.

## Start Here

- [`import-vault.ts`](./import-vault.ts): Import parser, manifest types, and CLI
  entry point.
- [`export-vault.ts`](./export-vault.ts): Manifest-to-vault export logic.
- [`vault-sync.ts`](./vault-sync.ts): Local vault/state sync engine.

## Children

- This folder has no child directories.

## Key Contracts

- Import/export code is user-data sensitive and should avoid lossy transforms.
- Markdown, frontmatter, tags, wiki links, and attachments should preserve
  Obsidian-compatible meaning where possible.
- CLI output should avoid printing private file contents unless explicitly
  requested by a command mode.

## Update Triggers

- Update when manifest shape, import/export semantics, sync behavior, CLI flags,
  or vault tests change.

## Testing

- `npm test --workspace @eweser/ewe-note -- import-vault`: Runs import tests.
- `npm test --workspace @eweser/ewe-note -- vault-sync`: Runs vault sync tests.
