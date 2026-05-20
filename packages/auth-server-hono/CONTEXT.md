# Auth And Grants Language

This file is a glossary for `@eweser/auth-server-hono`. Keep it free of
implementation steps, TODOs, and temporary design notes.

## Terms

- **Auth server**: The Hono service that owns users, sessions, OAuth, app
  clients, room grants, sync-token issuance, and security/audit metadata.
- **Session**: A signed-in browser or API identity for an EweserDB user.
- **App client**: A registered app identity that requests room access.
- **Access request**: The app-to-auth-server request describing desired
  collections, rooms, redirect target, and capabilities.
- **Access grant**: The persisted approval that authorizes an app or agent for
  selected rooms and capabilities.
- **Room ACL**: The room-level access-control state used to determine owner,
  admin, read, and write rights.
- **Sync token**: The short-lived token minted by the auth server for a specific
  sync connection scope.
- **Agent token**: A token for MCP or other AI agent access. Agent tokens must
  stay bounded by readable and writable room scopes.
- **Operational mirror**: Auth-server PostgreSQL data that helps enforce auth or
  audit behavior but is not the canonical product data store.
- **Provider profile**: Non-secret storage-provider metadata visible to users or
  operators. Provider secrets remain server-side.

## Ambiguous Terms

- **Grant**: Clarify whether it is an app access grant, room ACL entry, OAuth
  authorization, or sync token claim.
- **User data**: Product/user configuration that must interoperate belongs in
  EweserDB rooms or shared schemas, not only in auth-server PostgreSQL.
