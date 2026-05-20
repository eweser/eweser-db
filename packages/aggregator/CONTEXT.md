# Public Aggregation Language

This file is a glossary for `@eweser/aggregator`. Keep it free of
implementation steps, TODOs, and temporary design notes.

## Terms

- **Aggregator**: The server-side service that indexes explicitly public room
  data for search.
- **Indexed row**: A database row derived from public room data for search or
  discovery.
- **Webhook event**: A signed or trusted update received from the sync relay for
  possible indexing.
- **Indexability**: The policy decision that determines whether a room or
  collection may be indexed.
- **De-indexing**: Removing or hiding indexed rows when a room becomes private,
  a document is deleted, or publication state is missing.
- **Public search**: Search over indexed public rows only. Public search must
  not imply access to private synced data.
- **Search payload**: The limited document data returned by public search.

## Ambiguous Terms

- **Shared**: Do not use `shared` to mean public. A room can be shared with
  collaborators without being publicly indexed.
- **Visible**: Clarify whether visibility is app-local, collaborator-readable,
  public-searchable, or MCP-readable.
