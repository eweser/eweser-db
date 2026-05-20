# Ewe Note Bases And Vaults Language

This file is a glossary for `@eweser/ewe-note`. Keep it free of implementation
steps, TODOs, and temporary design notes.

## Terms

- **Ewe Note**: The offline-first note-taking app built on EweserDB rooms.
- **Base**: The user-facing workspace unit for vault-style data.
- **Vault**: The Obsidian-compatible filesystem/workspace concept represented
  by a base.
- **Note room**: A room in the `notes` collection that stores note documents for
  a base or vault.
- **Note**: A document representing user-authored note content and metadata.
- **Source path**: Device-local or imported path metadata used for
  Obsidian-compatible sync and round trips.
- **Attachment**: File metadata associated with note content. Attachment bytes
  may live in object storage or local cache depending on configuration.
- **Workspace mode**: The current pane/layout mode of the app shell.

## Ambiguous Terms

- **Folder**: Use only for filesystem or note hierarchy concepts; do not use it
  as a synonym for base, vault, room, or collection.
- **Sync**: Clarify whether this means EweserDB room sync, Obsidian filesystem
  import/export, or attachment transfer.
