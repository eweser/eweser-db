# Ewe Note Extensions

## Plain English

This folder contains Obsidian Flavored Markdown helpers and editor-adjacent
extension utilities for callouts, highlights, wiki links, tags, and image
embeds.

## Owns

- OFM-to-TipTap and TipTap-to-OFM serialization helpers.
- Parsing helpers for wiki links and vault image embed syntax.
- Extension modules that preserve Obsidian-compatible note semantics.

## Start Here

- [`ofm-serializer.ts`](./ofm-serializer.ts): Main OFM conversion bridge.
- [`wiki-link.ts`](./wiki-link.ts): Wiki and vault URL parsing helpers.
- [`image-embed.ts`](./image-embed.ts): Obsidian image dimension parsing.

## Children

- This folder has no child directories.

## Key Contracts

- Serialization changes can affect import/export round trips and editor saves.
- Obsidian-specific syntax should degrade gracefully when TipTap lacks a
  matching native feature.
- Attachment URL resolution is delegated to `../utils/attachment-resolver.ts`.

## Update Triggers

- Update when OFM syntax handling, wiki-link parsing, image embed behavior,
  callout/highlight/tag handling, or editor serialization changes.

## Testing

- `npm test --workspace @eweser/ewe-note`: Runs Ewe Note tests.
- Add focused tests when changing serialization or parser behavior.
