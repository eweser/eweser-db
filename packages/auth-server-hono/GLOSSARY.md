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
- **Grant satisfaction**: The server-side check that an existing access grant
  covers a new app access request.
- **Agent token**: A token for MCP or other AI agent access. Agent tokens must
  stay bounded by readable and writable room scopes.
- **Remote MCP endpoint**: The auth-server HTTP `/mcp` route that accepts OAuth
  bearer tokens or agent tokens and exposes MCP tools over scoped room access.
- **Server identity**: The auth server's stable federation identity, including
  public verification material and service URLs.
- **Peer server**: A remote EweserDB auth server registered for federation or
  backup-listener flows.
- **Federated principal**: A user or service identity that belongs to a peer
  server and may appear in room ACL or relay authorization decisions.
- **Federation request**: A signed server-to-server request with replay
  protection and explicit peer trust checks.
- **Backup listener**: A peer-server role authorized to receive selected room
  updates for recovery, separate from collaborator grants.
- **Operational mirror**: Auth-server PostgreSQL data that helps enforce auth or
  audit behavior but is not the canonical product data store.
- **Provider profile**: Non-secret storage-provider metadata visible to users or
  operators. Provider secrets remain server-side.

## Ambiguous Terms

- **Grant**: Clarify whether it is an app access grant, room ACL entry, OAuth
  authorization, or sync token claim.
- **Identity**: Clarify whether it is a local user, app client, agent token,
  server identity, peer server, or federated principal.
- **User data**: Product/user configuration that must interoperate belongs in
  EweserDB rooms or shared schemas, not only in auth-server PostgreSQL.
