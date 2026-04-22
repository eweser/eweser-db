---
"@eweser/shared": patch
---

Use source-based type resolution for local workspace consumers and stop relying on committed `types/**` artifacts. Add `publishConfig.exports` with `dist/index.d.ts` types so npm consumers continue to receive proper TypeScript declarations.
