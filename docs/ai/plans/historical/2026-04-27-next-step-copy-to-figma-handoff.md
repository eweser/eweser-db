## Handoff: Next Step — Copy Deck To Text-Only Figma

Date: 2026-04-27

## Objective

Turn the current core copy deck into a cleaner text-only Figma structure before any visual polish resumes.

The next session should not start with CSS or styled Figma components. It should first decide which copy is active, remove/promote candidate alternatives, and then refresh the plain boxes-and-text Figma frames.

## Start Here

Read in this order:

1. `docs/ai/plans/2026-04-27-core-design-session-handoff.md`
2. `docs/ai/plans/2026-04-27-core-copy-deck.md`
3. `docs/ai/plans/2026-04-27-core-figma-design-system-recovery.md`

Primary file to edit:

- `docs/ai/plans/2026-04-27-core-copy-deck.md`

Primary Figma page to update:

- `04 Text Structure` (`2218:2`)

## Current State

Update:

The user paused the Figma refresh and asked for a full text-only version of all pages first. That deliverable now lives at `docs/ai/plans/2026-04-27-full-text-page-copy.md`.

The copy deck has:

- A clear usage contract in `How This Doc Gets Used`
- Voice rules
- Story sources
- Core message
- Audience promises
- Named call-out strategy
- Landing page sections marked as `Current copy`
- Candidate alternatives kept as optional raw material
- Core product page copy
- Figma sync notes

The Figma text-only page already exists, but it was created before the latest copy cleanup. It should be refreshed after the copy deck is reviewed.

## Key Decisions To Preserve

- Public copy should not use `Surfaces`.
- Public copy should use `Connected Tools` instead of `Surfaces` or `Apps/MCP`.
- Current connected-tools headline: `Let apps and agents ask permission.`
- Ewe Note is a proof point/demo, not the whole product.
- Named examples should be name-adjacent and careful:
  - Evernote-style note trust
  - Duolingo-style learning data
  - leaving large ecosystems
  - Obsidian-scale knowledge base vs simple AI notes
- Avoid direct hostile claims like:
  - `Evernote loses your notes`
  - `Duolingo traps your data`
  - `Google steals your life`
  - `Obsidian is bloated`

## Next Step Checklist

1. Review the `Landing Page` section of the copy deck.
2. For each landing section, decide:
   - Keep current copy
   - Promote a candidate alternative
   - Delete stale alternatives
   - Rewrite from story sources
3. Pay special attention to:
   - Whether `Connected Tools` is the right nav/section label
   - Whether `Let apps and agents ask permission.` is strong enough
   - Whether the story examples are emotionally specific enough
   - Whether the page is trying to cover too many use cases
   - Whether future personal sharing/file storage should stay future-facing
4. Once current copy is stable, refresh Figma `04 Text Structure`.
5. Validate the refreshed text-only Figma frames:
   - Does the page read well with no styling?
   - Is the order clear?
   - Are the section headings understandable to normal users?
   - Are developer and user promises both represented?
   - Is AI present without becoming generic AI-memory hype?

## Figma Frames To Refresh

Use only `Current copy` from the copy deck unless the user explicitly promotes an alternative.

- `Landing / Text Structure / Desktop 1440` (`2218:3`)
- `Landing / Text Structure / Mobile 390` (`2218:79`)
- `Data Home / Text Structure / Desktop 1440` (`2218:155`)
- `Connected Apps / Text Structure / Desktop 1440` (`2218:170`)
- `MCP Access / Text Structure / Desktop 1440` (`2218:185`)
- `Auth / Text Structure / Desktop 1440` (`2218:200`)

## Suggested Figma Update Approach

Use the Figma plugin with `figma-use`.

Recommended workflow:

1. Inspect the existing `04 Text Structure` page.
2. Update text in place if the existing frame structure is still useful.
3. If the structure is stale, create a new set of frames to the right named with `V2`, leaving the old frames intact for comparison.
4. Keep the frames plain:
   - grayscale boxes
   - one accent at most
   - no decorative assets
   - no final colors
   - no shadows beyond simple borders
5. Return created/mutated node IDs in every `use_figma` call.

## Do Not Do Yet

- Do not polish the landing CSS.
- Do not choose a final visual landing variant yet.
- Do not rebuild the component system yet.
- Do not implement a large code refactor from the copy deck alone.
- Do not turn Stitch exports into final Figma components.

## Definition Of Done For This Next Step

- The copy deck has one coherent current landing copy path.
- Candidate alternatives are either promoted, removed, or clearly parked.
- The Figma `04 Text Structure` page reflects the approved current copy.
- The text-only landing frame reads coherently without styling.
- The user can decide whether the message is ready for visual composition.

## After This Step

Once the text-only Figma frames are approved:

1. Choose a canonical visual direction from landing V1/V2/V3 or create a V4.
2. Map text-only sections to existing Figma components.
3. Build the visual landing page from the component system.
4. Then implement the approved design in `packages/landing`.
