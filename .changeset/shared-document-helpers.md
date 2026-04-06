---
"@eweser/shared": minor
---

Add document CRUD helpers to @eweser/shared: `getDocuments`, `newDocument`, `buildRef`, `randomString`, `getRoomDocuments`, and types `Documents<T>`, `GetDocuments<T>`. Added `yjs` as a peerDependency. These helpers are moved from `@eweser/db` to enable the MCP server to use the same data-layer logic without depending on the full SDK.
