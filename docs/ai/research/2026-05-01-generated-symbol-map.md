# Generated Symbol Map Research

## Question

Should EweserDB add a generated machine-readable repo map alongside the
human-maintained `INDEX.md` tree?

## Findings

- The new `INDEX.md` tree covers human navigation, ownership, update triggers,
  and testing commands. It intentionally avoids trying to describe every export.
- The repo already has TypeScript installed, so a future script could use the
  TypeScript compiler API from the existing toolchain to inspect source files
  without adding runtime dependencies.
- A simple export map could list files, exported symbols, and import edges for
  `packages` and `examples`, but it would not understand runtime ownership or
  architectural intent.
- Tree-sitter or language-server-backed graphing would provide richer context,
  but it would add toolchain complexity and needs a separate design pass.

## Options

### No Generated Map Yet

Keep the current human-authored index and advisory source-header coverage. This
has the lowest maintenance cost and avoids noisy generated artifacts before the
manual navigation layer proves useful.

### Simple TypeScript Export Map

Add a script that uses the existing TypeScript compiler API to produce a compact
file/export/import map in an ignored or generated Markdown/JSON path. This could
help agent orientation and impact analysis, but it needs decisions about
generated-file ownership, CI drift checks, and token budget.

### Graph-Backed Code Memory

Use Tree-sitter or a language-server-backed graph to capture symbols, imports,
and relationships. This could support search hints and deeper impact analysis,
but it should be planned as a separate code-memory feature with explicit
dependency, runtime, and storage choices.

## Recommendation

Defer generated maps for now. The first priority is to prove that the
human-authored `INDEX.md` tree stays accurate in normal PRs and that
`npm run code-index:check` is not noisy.

If the manual layer proves useful, write a new plan for a simple TypeScript
export map. That plan should define the generated output location, whether it is
checked into Git, how CI handles drift, and which agent workflows consume it.

## Next Plan Outline

- Inspect the TypeScript compiler API already available through the workspace.
- Prototype an ignored export-map command on a temporary output path.
- Compare output size against agent context budgets.
- Decide whether generated output belongs in Git or only in local tooling.
- Add CI only if drift failures are precise and low noise.

## Verification

No local experiment was run. This spike is based on the existing repository
toolchain and the approved plan's constraints against adding new parser
dependencies in this implementation pass.
