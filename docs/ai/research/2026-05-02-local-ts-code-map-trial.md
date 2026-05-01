# Local TypeScript Code Map Trial

## Question

Can a zero-dependency TypeScript import/export map improve EweserDB agent
navigation enough to justify maintained tooling, without adding a third-party
Tree-sitter or graph MCP dependency?

## Prototype

- Added `scripts/code-map/generate-code-map.mjs`.
- Added `npm run code-map`, which writes `.ai/code-map.json`.
- `.ai/` is ignored so generated output stays local.
- The generator uses the existing `typescript` package and scans `packages/`
  and `examples/`.

## Trial Results

- Parsed files: 350.
- Files with exports: 292.
- Pretty JSON output size: 1,068,022 bytes.
- The full map is too large to paste into model context, but targeted queries
  against it produce compact answers.

### `buildRef`

- Defined in `packages/shared/src/utils/documents.ts`.
- Re-exported from `packages/db/src/utils/index.ts`.
- Imported by name in `packages/db/src/examples/dbShape.ts`.
- `rg` cross-check matched these locations.

### `@eweser/shared` Import Counts

- `packages/db`: 22 import/re-export declarations.
- `packages/auth-server-hono`: 9.
- `packages/app`: 5.
- `packages/ewe-note`: 5.
- `packages/mcp-server`: 2.

### Files With Most Exports

- `packages/ewe-note/src/app/components/ui/sidebar.tsx`: 24.
- `packages/ewe-note/src/components/ui/sidebar.tsx`: 24.
- `packages/examples-components/src/components/styles.ts`: 23.
- `packages/db/src/types.ts`: 21.
- `packages/app/src/lib/api.ts`: 19.
- `packages/auth-server-hono/src/model/oauth.ts`: 18.
- `packages/auth-server-hono/src/model/agents.ts`: 14.

### Auth Agent / Grant / MCP Files

The map surfaced the expected backend entry points without reading full source
files:

- `packages/auth-server-hono/src/model/agents.ts`
- `packages/auth-server-hono/src/model/oauth.ts`
- `packages/auth-server-hono/src/model/access_grants.ts`
- `packages/auth-server-hono/src/routes/agents.ts`
- `packages/auth-server-hono/src/routes/mcp.ts`
- `packages/auth-server-hono/src/routes/access-grant.ts`
- `packages/auth-server-hono/src/middleware/agent-auth.ts`
- `packages/auth-server-hono/src/middleware/combined-agent-auth.ts`
- `packages/auth-server-hono/src/db/schema/agents.ts`
- `packages/auth-server-hono/src/db/schema/oauth.ts`
- `packages/auth-server-hono/src/db/schema/access_grants.ts`

### Example SDK Dependencies

Examples currently import `@eweser/db`, not `@eweser/shared`, for their direct
SDK-facing app code:

- `examples/example-basic/src/AppBasic.tsx`
- `examples/example-interop-flashcards/src/App.tsx`
- `examples/example-interop-flashcards/src/AppBasic.tsx`
- `examples/example-interop-notes/src/App.tsx`
- `examples/example-interop-notes/src/AppBasic.tsx`
- `examples/example-multi-room/src/App.tsx`
- `examples/example-multi-room/src/AppBasic.tsx`
- `examples/react-native/src/AppReactNative.tsx`
- `examples/react-native/src/StatusBar.tsx`

## Evaluation

- Fewer exploratory tool calls: yes for symbol/export/import questions.
- Less raw source dumped into context: yes when queried locally, no if the full
  map is pasted into context.
- Faster path to relevant files: yes for the five trial questions.
- Fewer missed re-export/barrel relationships: yes for named re-exports.
- Useful output size for model context: yes only for targeted summaries.
- No noisy generated artifacts in Git: yes; `.ai/` is ignored.

## Limitations

- This is a syntax-level map, not a type-checked graph.
- It does not resolve relative import specifiers to canonical files.
- It does not expand `export * from ...` into concrete symbols.
- It counts import declarations, not runtime usage frequency.
- It should complement `INDEX.md`, not replace source reading before edits.

## Recommendation

Keep the local TypeScript map prototype. It is useful enough for agent
navigation questions and cheap enough to maintain as experimental tooling.

Do not add CI drift checks or generated files in Git yet. The next improvement,
if needed, should be import resolution and a small query CLI so agents can ask
for targeted answers without loading `.ai/code-map.json` directly.
