# EweserDB Grill-With-Docs Test Prompts

Use these prompts to smoke-test the skill against real EweserDB docs. Each
prompt should keep the skill in planner/docs mode: glossary and plan edits are
allowed, product code edits are not.

1. `$eweser-grill-with-docs on docs/ai/plans/2026-05-16-db-readme-todo-backlog.md run 4. Stress-test server identity, peer server, federation request, and federated principal language before implementation. Ask one question at a time and update CONTEXT.md files only when a term is resolved.`

2. `$eweser-grill-with-docs on docs/ai/plans/2026-05-16-db-readme-todo-backlog.md run 5. Challenge every use of "permission", "access", "identity", and "relay" against the context map. Recommend canonical wording from the repo where possible.`

3. `$eweser-grill-with-docs on docs/ai/plans/2026-05-16-db-readme-todo-backlog.md run 6. Distinguish user snapshot, operator backup, backup listener, sync relay persistence, and federation-as-backup. Update glossary docs if the distinctions are stable.`

4. `$eweser-grill-with-docs on docs/ai/plans/2026-05-16-db-readme-todo-backlog.md run 7. Grill the encrypted-room decision against privacy, public aggregation, MCP access, collaboration, account recovery, passkeys, and authenticator apps. End with ADR candidates and open terminology questions.`

5. `$eweser-grill-with-docs on docs/ai/plans/2026-05-16-db-readme-todo-backlog.md run 9. Refine schema/API versioning language so it separates SDK API, shared collection schema, auth API, sync protocol, aggregator API, and storage provider profile compatibility.`

6. `$eweser-grill-with-docs on docs/ai/plans/2026-05-16-db-readme-todo-backlog.md run 11. Decide whether "permission page" is acceptable user-facing copy or whether this plan should use access approval, access grant, grant satisfaction, and app capability instead.`

7. `$eweser-grill-with-docs over packages/db/README.md, ARCHITECTURE.md, and CONTEXT-MAP.md. Find stale or ambiguous terms left from the old README TODO list, especially around public data, backups, federation, E2EE, and migrations. Make docs-only glossary or plan edits.`

8. `$eweser-grill-with-docs over packages/aggregator/README.md and packages/aggregator/CONTEXT.md. Check whether public search, public room, publication state, indexability, and de-indexing are consistently named and do not imply private synced data is searchable.`

9. `$eweser-grill-with-docs over packages/mcp-server/README.md, packages/mcp-server/CONTEXT.md, and the active AI memory plans. Separate Agent Journal, project wiki, memory scope, readable room scope, and writable room scope.`

10. `$eweser-grill-with-docs on a new feature idea: "let agents read all my notes and make a backup." Force precise EweserDB language for agent tokens, readable room scope, user snapshots, encrypted rooms, and public aggregation before any implementation plan is written.`
