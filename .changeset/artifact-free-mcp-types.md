---
"@eweser/mcp": patch
---

Point workspace type resolution to source while keeping runtime distribution entrypoints in `dist`. Add `publishConfig.exports` with `dist/lib.d.ts` types and enable tsup `dts` output so npm consumers get proper TypeScript declarations.
