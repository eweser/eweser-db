# EweserDB Shared Language

This file is a glossary for product language that crosses packages. Keep it
free of implementation steps, TODOs, and temporary design notes.

## Terms

- **EweserDB**: The local-first, user-owned database product and SDK ecosystem.
- **User-owned data**: Data controlled by the user and portable across apps,
  agents, and self-hosted deployments.
- **Room**: A Yjs-backed container with access control. Rooms group documents
  that share a collection key and schema.
- **Collection**: A named set of documents with a shared shape, such as `notes`
  or `fileAttachments`.
- **Shared schema**: A TypeScript and runtime contract that lets independent
  apps understand the same collection data.
- **Document**: One item inside a room collection. Documents are changed through
  EweserDB/Yjs helpers, not by directly mutating observed Yjs data.
- **Reference**: A cross-document `_ref` built from auth server, collection,
  room, and document identifiers.
- **App**: A client that requests access to user-owned rooms through the auth
  flow, then uses the SDK locally.
- **Access grant**: An auditable authorization that lets an app or agent read or
  write selected rooms.
- **Sync token**: A short-lived token that lets a client connect to the sync
  relay for a scoped room.
- **Public room**: A room intentionally published for public aggregation or
  search. Public is explicit; private rooms must not be indexed.
- **Base**: The user-facing workspace unit for vault-style data. A base groups
  rooms without replacing room collection boundaries.
- **Vault**: The Obsidian-compatible filesystem/workspace concept represented by
  a base in Ewe Note.
- **Agent Journal**: The default Eweser-native memory strategy for coding
  continuity, decisions, preferences, and project session history.
- **Project scope**: The boundary agents use for repo or project-specific memory
  and room access.

## Ambiguous Terms

- **Database**: Use `EweserDB` for the product, `Database` for the SDK class,
  and `PostgreSQL` only for auth-server operational storage.
- **Permission**: Prefer the precise term: access grant, room ACL, token scope,
  or app capability.
- **Public data**: Do not use as shorthand for "shareable" or "synced". Use
  `public room` only when indexing/search is explicitly enabled.
- **Memory**: Clarify whether this means Agent Journal records, project wiki
  source material, derived processor output, or ordinary note content.
