## Handoff: Core EweserDB Design / Copy Pass

Date: 2026-04-27

## Current Objective

Continue the EweserDB core landing/design-system recovery work from a copy-first foundation.

The goal is to produce a distinctive, coherent core EweserDB landing page and UI component system that matches the stronger Stitch/Figma industrial-punk direction without becoming generic SaaS or Ewe Note-specific UI.

## Key Files

- Main recovery plan: `docs/ai/plans/2026-04-27-core-figma-design-system-recovery.md`
- Copy source of truth: `docs/ai/plans/2026-04-27-core-copy-deck.md`
- Prior landing story plan: `docs/ai/plans/2026-04-27-landing-page-story-pass.md`
- Prior authenticated screens plan: `docs/ai/plans/2026-04-27-authenticated-surfaces-design-pass.md`
- Current landing implementation: `packages/landing/src/pages/index.astro`

## Figma Context

Primary Figma file:

`https://www.figma.com/design/2Y8rOwlyFVT2jtTJMyY72V/EweserDB-Punk-Data-Sovereignty-Design-System--Copy-?node-id=2042-51&t=WGuFW4CRxHCyK1xT-4`

Important pages / frames:

- `00 Brand System`
- `01 Components`
- `02 Landing`
- `03 Eweser Core`
- `04 Text Structure`

Text-only Figma page:

- Page: `04 Text Structure` (`2218:2`)
- `Landing / Text Structure / Desktop 1440` (`2218:3`)
- `Landing / Text Structure / Mobile 390` (`2218:79`)
- `Data Home / Text Structure / Desktop 1440` (`2218:155`)
- `Connected Apps / Text Structure / Desktop 1440` (`2218:170`)
- `MCP Access / Text Structure / Desktop 1440` (`2218:185`)
- `Auth / Text Structure / Desktop 1440` (`2218:200`)

Landing variants:

- V1: `Landing Page / Desktop 1440 - Ecosystem Control Plane` (`2042:51`)
- V2: `Landing Page / Desktop 1440 - Ecosystem Control Plane V2` (`2114:2`)
- V3: `Landing Page / Desktop 1440 - Ecosystem Control Plane V3` (`2178:63`)

Known Figma system:

- `01 Components` has a local component library: `Component Library / Punk System`
- 49 local components found
- Local tokens exist in `EweserDB Brand Tokens`
- Local text styles and hard-shadow effect exist
- Figma is not the weak point; the current main gap is aligning copy, Figma, and implementation.

## Decisions Made

- Work copy-first before more visual styling.
- `docs/ai/plans/2026-04-27-core-copy-deck.md` is now the source of truth for message hierarchy.
- Only `Current copy` sections should be synced into the text-only Figma frames.
- `Candidate alternatives` are optional raw material and should not drive Figma/code until promoted.
- Avoid public-facing jargon like `Surfaces`.
- Replace `Surfaces` / `Apps/MCP` public language with `Connected Tools` where possible.
- Current connected-tools headline: `Let apps and agents ask permission.`
- Ewe Note should be presented as proof point/demo, not the whole product.
- Named product examples can be used carefully as name-adjacent story references:
  - Evernote-style note trust
  - Duolingo-style learning data
  - leaving large ecosystems
  - Obsidian-scale knowledge base vs simple AI notes
- Avoid direct overclaims like `Evernote loses your notes` or `Duolingo traps your data`.

## Current Copy Direction

Core message:

EweserDB is a local-first database users own and apps share.

Hero:

- Kicker: `Local-first database for user-owned software`
- Headline: `Your data. Not their moat.`
- Body: `EweserDB is a local-first database for apps that refuse lock-in. Your notes, learning work, documents, agents, and collaborative tools can all work from the same user-owned data layer.`
- CTAs: `Explore the ecosystem`, `Build with EweserDB`

Important story themes:

- Notes app trust: years of notes should not be fragile.
- Learning history should be reusable outside one app.
- Trying a new app should feel like changing views, not moving houses.
- Developers should be able to build focused micro apps without rebuilding a backend.
- Apps should work offline and feel fast because the data is local first.
- AI should access user-owned context through scoped, reviewable permissions.
- The cloud can sync without becoming the owner.

## Code State

The landing page has already received some copy/name changes:

- `Surfaces` nav label changed to `Connected Tools`
- Section label changed to `04 // Connected Tools`
- Section headline changed to `Let apps and agents ask permission.`
- Internal array renamed from `surfaceCards` to `appsMcpCards`

The landing implementation is still not visually aligned with Figma:

- It still has slate/emerald remnants.
- It still uses rounded SaaS-ish cards and glow effects.
- It still relies on one-off Tailwind classes in `packages/landing/src/pages/index.astro`.
- It should not be treated as visually final.

## Recommended Next Steps

1. Review `docs/ai/plans/2026-04-27-core-copy-deck.md` with the user.
2. Promote or delete candidate alternatives until the landing page has one clear current copy path.
3. Refresh the Figma `04 Text Structure` frames from the approved current copy.
4. Validate the text-only Figma page for hierarchy:
   - Does the page read well without styling?
   - Are sections too numerous?
   - Are named story examples strong enough but not petty?
   - Is `Connected Tools` understandable?
5. Choose the canonical visual landing variant among V1/V2/V3, or compose a V4 from the best parts.
6. Only then move into visual styling and code implementation.

## Cautions

- Do not jump straight into polishing CSS. The copy hierarchy is still moving.
- Do not let Stitch become the source of truth; use it for visual mood only.
- Do not let Ewe Note define the core EweserDB product.
- Do not overpromise future social/file-storage features; keep them marked future-facing.
- Do not use jargon like `surface` in public copy.
- Do not make the landing page a complaint list about specific products.

## Verification / Tests

No automated tests were run for the copy/Figma work.

Before code implementation later:

- Run targeted landing build/checks.
- Start the landing dev server.
- Verify desktop/mobile screenshots against approved Figma frames.
- Then run broader repo checks as appropriate.
