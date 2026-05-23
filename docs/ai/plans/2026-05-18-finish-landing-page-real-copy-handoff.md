# Plan: Finish Landing Page With Real Copy

## Goal

Finish the public EweserDB landing page so every remaining section uses the real
copy from `docs/ai/plans/2026-04-27-full-text-page-copy.md`, matches the
brighter optimistic visual direction, and stays honest about shipped versus
planned product capabilities.

## Scope

- In:
  - Complete the main landing page at `packages/landing/src/pages/index.astro`.
  - Continue the bright optimistic visual system in
    `packages/landing/src/styles/global.css`.
  - Use the supplied PNG mockup assets from
    `design/eweserdb_mockup_png_assets/` when they fit.
  - Add optimized public landing assets under
    `packages/landing/public/assets/mockup/`.
  - Preserve the reviewed top direction: header, hero, and `00 // How it works`.
  - Keep the user-requested removal of the hero `Explore what's possible` CTA.
  - Codify landing-specific style guidance after the remaining page direction is
    proven in-browser.
- Out:
  - Auth app, Ewe Note, MCP server, sync server, aggregator, or SDK behavior.
  - Backend routes, database migrations, package API changes, and changesets.
  - Rewriting the full product/design context for EweNote.
  - Publishing, deployment, or PR creation unless separately requested.

## Assumptions / Open Questions

- Assumption: The copy source of truth is
  `docs/ai/plans/2026-04-27-full-text-page-copy.md`.
- Assumption: The hero tertiary CTA from that copy is intentionally removed per
  user request on 2026-05-18.
- Assumption: The current branch is `solarpunk`, and the landing workspace is
  `packages/landing`.
- Assumption: The currently approved visual direction is bright, optimistic,
  solarpunk, and more cyan/green/blue than the older beige/olive pastoral page.
- Assumption: Existing uncommitted files under `design/` are user/design WIP.
  Do not revert them or overwrite them without explicit approval.
- Assumption: Current WIP already includes:
  - top-section implementation in `packages/landing/src/pages/index.astro`;
  - bright CSS overrides in `packages/landing/src/styles/global.css`;
  - public mockup assets in `packages/landing/public/assets/mockup/`;
  - upscaled hero background as `hero-solarpunk-clean-empty-left@4x.webp` and
    `hero-solarpunk-clean-empty-left@4x.jpg`.
- Open question: Should the page keep the current first two sections exactly as
  implemented, or should Coder make final polish fixes while completing the rest
  of the page?
- Open question: Should the final page preserve the `01 //`, `02 //` numbering
  verbatim on all sections, or can the visual treatment soften those labels on
  mobile?
- Open question: Should `AI + MCP` remain visually first in Ecosystem, or should
  `Ewe Note` remain the first concrete proof point despite the broader platform
  positioning?

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Runs 3 and 4 can be split across separate worktrees only
after Run 2 establishes section primitives and naming conventions.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Freeze Current Top Direction And Asset Baseline

- **Id**: `run-1`
- **Title**: `Freeze current hero/how-it-works direction`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Current header, hero, and how-it-works sections are cleaned up, verified, and
    treated as the design baseline for lower sections.
- **Files**:
  - `packages/landing/src/pages/index.astro`: keep header, hero, and how-it-works
    source-of-truth copy, with only two hero CTAs.
  - `packages/landing/src/styles/global.css`: keep bright hero and step section
    styles; remove dead selectors from the removed tertiary CTA if any remain.
  - `packages/landing/public/assets/mockup/`: keep only assets used by the page
    or clearly intended for the next runs.
- **Steps**:
  - [ ] Confirm the hero no longer renders `Explore what's possible`.
  - [ ] Confirm the hero background uses the high-resolution WebP.
  - [ ] Check desktop and mobile screenshots for text overlap, horizontal
        overflow, and background crop quality.
  - [ ] Remove any unused copied asset from `packages/landing/public/assets/mockup/`
        unless it is explicitly needed by a later run.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - `rg -n "Explore what's possible|hero-cta-tertiary" packages/landing/src`
    should find nothing.
  - `curl -fsS http://127.0.0.1:4000/ | rg -n "Your data is not their pasture|Three steps to owning your data"`
  - Capture screenshots at desktop `1440x1600` and mobile `390x1100`.
- **Manual test handoff**:
  - Start with `npm run dev --workspace @eweser/landing`.
  - Open `http://127.0.0.1:4000/`.
  - Verify the first viewport feels like the bright mockup direction, has only
    `Connect my AI` and `Try Ewe Note`, and the background does not look heavily
    stretched on a wide desktop.
- **Dependencies**:
  - None.
- **Model tier**: `coder`
- **Risk level**: `low`

### Run 2: Build Reusable Landing Section Primitives

- **Id**: `run-2`
- **Title**: `Create section primitives for the rest of the page`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Lower sections can be composed without repeating large ad hoc markup and CSS.
- **Files**:
  - `packages/landing/src/pages/index.astro`: define section data arrays for
    Problem, Model Shift, Ecosystem, Apps, MCP, Developers, and Final CTA.
  - `packages/landing/src/styles/global.css`: add reusable styles for section
    heading rows, comparison panels, status chips, feature lists, asset-led
    media blocks, and CTA groups.
- **Steps**:
  - [ ] Keep data local to `index.astro`; do not introduce a new framework or
        app-wide abstraction unless duplication becomes unmanageable.
  - [ ] Create a reusable section label pattern that supports:
        `01 // The Problem`, `02 // The Reversal`, `03 // Ecosystem`,
        `04 // Apps`, `04b // MCP`, and `05 // Developers`.
  - [ ] Create status-note treatment for shipped, partially shipped, planned,
        and future-facing notes without making the page feel like release notes.
  - [ ] Keep body line length around 65 to 75 characters.
  - [ ] Avoid nested cards and repeated identical icon-card grids.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Browser screenshot of top three sections after primitives are applied.
  - `rg -n "lorem|placeholder|TODO|generated copy" packages/landing/src`
    should not find visible page copy placeholders.
- **Manual test handoff**:
  - Review whether the primitive system can support both manifesto-like sections
    and practical developer proof without collapsing into generic SaaS cards.
- **Dependencies**:
  - `run-1`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Implement Problem And Model Shift Sections

- **Id**: `run-3`
- **Title**: `Implement 01 Problem and 02 Reversal`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - The page explains platform captivity and the EweserDB reversal using the real
    copy.
- **Files**:
  - `packages/landing/src/pages/index.astro`: replace the legacy proof grid after
    how-it-works with the Problem and Model Shift sections.
  - `packages/landing/src/styles/global.css`: add section-specific layouts.
  - `packages/landing/public/assets/mockup/`: add any selected comparison or
    diagram assets.
- **Steps**:
  - [ ] Use the Problem copy exactly in substance:
        `Apps became landlords.`, the old enclosure list, the open field list,
        and `Own the substrate. Swap the interface.`
  - [ ] Use the Model Shift copy exactly in substance:
        `Switch apps. Keep your work.`, app-owned data comparison, and
        user-owned data comparison.
  - [ ] Prefer a strong comparison layout over six identical cards.
  - [ ] Potential assets:
        `sections/integration-orbit-section@2x.png`,
        `illustrations/integration-orbit-full@2x.png`,
        `icons/hero-hex-lock@4x.png`,
        `icons/hero-hex-database@4x.png`,
        or simple CSS diagrams if the raster crops feel too baked-in.
  - [ ] If assets look grainy, awkwardly cropped, or semantically wrong, leave a
        clear placeholder treatment and record which asset needs regeneration.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Desktop and mobile screenshots from hero through Model Shift.
  - Manual scan that old placeholder proof-card copy is gone.
- **Manual test handoff**:
  - Confirm a first-time visitor can understand old model versus EweserDB model
    without reading the whole page.
- **Dependencies**:
  - `run-2`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Implement Ecosystem And Apps Sections

- **Id**: `run-4`
- **Title**: `Implement 03 Ecosystem and 04 Apps`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - The page shows concrete product possibilities and app paths without implying
    planned features are fully shipped.
- **Files**:
  - `packages/landing/src/pages/index.astro`: add Ecosystem cards, status notes,
    and Apps cards from the real copy.
  - `packages/landing/src/styles/global.css`: add ecosystem/app section layout.
  - `packages/landing/public/assets/mockup/`: add selected ecosystem/app icons.
- **Steps**:
  - [ ] Use the Ecosystem headline:
        `One sheep. All your data. With you anywhere.`
  - [ ] Include all six Ecosystem cards:
        AI + MCP, Collaborative notes, Knowledge base, Study tools, Micro apps,
        Personal sharing.
  - [ ] Include feature status notes, but compress them visually so they do not
        dominate the section.
  - [ ] Use the Apps headline:
        `Apps that work with your data, not against it.`
  - [ ] Include app cards for Ewe Note, More apps coming, and Build your own.
  - [ ] Potential assets:
        `illustrations/integration-center-hut-circle@3x.png`,
        integration icon circles,
        `ui-elements/feature-card-*.png`,
        and step/connector icon assets.
  - [ ] Keep Ewe Note as proof point, not the whole product story.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Desktop and mobile screenshots of Ecosystem and Apps.
  - Link check for `Open Ewe Note`, docs, and ecosystem anchors.
- **Manual test handoff**:
  - Confirm shipped/planned status is visible enough to be honest but not so loud
    that it reads as an internal roadmap page.
- **Dependencies**:
  - `run-3`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Implement MCP, Developers, Final CTA, And Footer

- **Id**: `run-5`
- **Title**: `Implement 04b MCP, 05 Developers, final CTA, and footer`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - The page has a complete conversion path for users, AI-client setup, and
    developers, using the full copy.
- **Files**:
  - `packages/landing/src/pages/index.astro`: replace legacy developer/closing
    sections with MCP, Developers, Final CTA, and footer phrase.
  - `packages/landing/src/styles/global.css`: complete responsive styling and
    footer treatment.
  - `packages/landing/public/assets/mockup/`: add code panel, connector cards,
    trust icons, bottom CTA landscape, and footer assets if useful.
- **Steps**:
  - [ ] Use MCP headline:
        `Give your AI a memory it can't take with it.`
  - [ ] Include supported clients:
        Claude Desktop, Claude web, ChatGPT web, GitHub Copilot, Codex,
        OpenClaw.
  - [ ] Include MCP feature statuses:
        setup shipped, scoped room-level access shipped, activity log UI planned.
  - [ ] Use Developers headline:
        `Build the app. Not the enclosure.`
  - [ ] Preserve the install command:
        `npm install @eweser/db yjs`.
  - [ ] Preserve trust-signal CTAs:
        Self-host on Railway and View on GitHub.
  - [ ] Use final CTA:
        `Bring it home.`
  - [ ] Include final footer phrase:
        `"Ewe-ser", pronounced "user". Because ewe are.`
  - [ ] Potential assets:
        `illustrations/code-panel@3x.png`,
        `illustrations/connector-cards-group@3x.png`,
        connector card/icon PNGs,
        trust icons,
        `backgrounds/bottom-cta-landscape-original@2x.png`,
        `illustrations/bottom-large-sheep-cutout-best-effort@3x.png`,
        `ui-elements/footer-logo-white-transparent@4x.png`.
  - [ ] If bottom landscape or connector assets are grainy at desktop width,
        upscale/optimize as WebP/JPEG or record regeneration need.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Full-page screenshots at desktop `1440x2200` or taller and mobile `390x1800`
    or taller.
  - Manual link check for account, Ewe Note, docs, GitHub, Railway, terms,
    privacy, and abuse links.
- **Manual test handoff**:
  - Confirm a user can identify three clear next actions:
    connect AI, try Ewe Note, and build/self-host.
- **Dependencies**:
  - `run-4`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 6: Landing Style Guidance And Final QA

- **Id**: `run-6`
- **Title**: `Document landing style direction and perform final QA`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - Durable guidance for the brighter landing direction plus final verification.
- **Files**:
  - `design/eweser-landing-page-variants/README.md`: append guidance only if it
    does not overwrite user WIP.
  - Or `docs/ai/plans/2026-05-18-finish-landing-page-real-copy-handoff.md`:
    update execution summary and regeneration notes if design README should not
    be touched.
  - `packages/landing/src/styles/global.css`: final cleanup only.
  - `packages/landing/src/pages/index.astro`: final copy/link cleanup only.
- **Steps**:
  - [ ] Codify the chosen visual direction:
        bright sky, meadow green, cyan data paths, blue primary CTA, optimistic
        solarpunk assets, low beige/olive dominance, no generic SaaS grids.
  - [ ] Record asset regeneration needs by section, with target crop/aspect
        ratio and purpose.
  - [ ] Check public copy for forbidden/internal language from the copy deck:
        avoid `surfaces`, `paradigm`, generic AI memory hype, and leading with
        `local-first database` as the main user explanation.
  - [ ] Check accessibility basics:
        heading order, alt text, keyboard-reachable nav, contrast, mobile menu,
        and no horizontal overflow.
  - [ ] Remove dead CSS from old legacy sections once replacement sections are
        complete.
  - [ ] Update this plan's Execution Summary and Self-Reflection.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
  - `npm run code-index:check` only if indexes or source headers are changed.
- **Verification**:
  - Full-page desktop and mobile screenshots.
  - `rg -n "placeholder|lorem|TODO|Explore what's possible" packages/landing/src`
    should not find visible unresolved copy.
  - `rg -n "—" packages/landing/src/pages/index.astro packages/landing/src/styles/global.css`
    should be reviewed; replace visible em dashes in authored copy unless the
    exact source quote requires one.
- **Manual test handoff**:
  - Hand the user the local URL, screenshot paths, remaining asset regeneration
    list, and any unresolved copy/status questions.
- **Dependencies**:
  - `run-5`
- **Model tier**: `coder`
- **Risk level**: `low`

## Stop Conditions

Stop and ask for user approval if:

- Finishing the page requires changing product truth in
  `2026-04-27-full-text-page-copy.md` rather than adapting layout around it.
- A section needs claims about MCP, collaboration, study tools, self-hosting, or
  marketplace behavior that contradict shipped/planned status notes.
- The existing assets are too grainy or semantically wrong for a key section and
  the fix would require fresh image generation rather than a placeholder or
  deterministic local optimization.
- Work would touch auth-server, sync-server, SDK, shared schemas, migrations,
  package APIs, or deployment configuration.
- User WIP in `design/` would need to be overwritten.
- Build or browser verification is blocked by missing local dependencies after a
  normal `npm install`.

## Approval Boundary

Approval of this plan authorizes Coder to finish the landing page in
`packages/landing`, add optimized static assets under
`packages/landing/public/assets/mockup/`, update landing-only style guidance,
run relevant landing verification, perform internal QA, and update this plan's
execution summary.

Approval does not authorize backend changes, auth/security behavior changes,
database migrations, published package API changes, unrelated refactors,
destructive git operations, direct pushes to `main`, or overwriting existing
design WIP outside the landing implementation boundary.

## Current Local State For Coder

- Local URL: `http://127.0.0.1:4000/`
- Dev server command: `npm run dev --workspace @eweser/landing`
- Current tmux helper session, if still running: `eweser-landing`
- Narrow build command: `npm run build --workspace @eweser/landing`
- Runtime orientation command before tests:
  `~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh status`
- If runtime endpoints are unknown or stale:
  `~/.codex/skills/eweser-runtime-orientation/scripts/eweser-runtime-orientation.sh refresh`
- Current key changed files:
  - `packages/landing/src/pages/index.astro`
  - `packages/landing/src/styles/global.css`
  - `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@2x.png`
  - `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@4x.webp`
  - `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@4x.jpg`
  - `packages/landing/public/assets/mockup/illustrations/step-1-house-circle@4x.png`
  - `packages/landing/public/assets/mockup/illustrations/step-2-lock-circle@4x.png`
  - `packages/landing/public/assets/mockup/illustrations/step-3-landscape-circle@4x.png`
- Existing WIP not owned by this plan unless separately approved:
  - `design/eweser-landing-page-variants/README.md`
  - untracked files under `design/eweser-landing-page-variants/`
  - `design/eweserdb_mockup_png_assets/`
  - `design/Pasted image.png`
  - `design/contact-sheet.png`

## Asset Regeneration Notes

- The hero source asset is only `1728x884`; the current implementation uses a
  deterministic `3456x1768` Lanczos upscale plus WebP/JPEG optimization. This
  reduces browser stretching but does not add true illustration detail.
- If the hero still looks grainy on very wide desktop, regenerate a real wide
  hero at 3000 to 4000 px wide with left negative space, no baked-in text, and
  the same solarpunk hut/sheep/data-path identity.
- Prefer assets without baked-in text. Placeholder text bars from mockups should
  not appear in final visible page sections.
- For each later section, choose the asset because it clarifies the section's
  copy. Do not force a graphic if it makes the real copy harder to read.

## Execution Summary

| Run     | Status      | Files Changed                                                                                                                | Verification                                                                                                                | Notes                                                                                              |
| ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `run-1` | In progress | `packages/landing/src/pages/index.astro`; `packages/landing/src/styles/global.css`; `packages/landing/public/assets/mockup/` | `npm run build --workspace @eweser/landing` passed on 2026-05-18 after hero CTA removal and 4x WebP/JPEG background update. | Header, hero, and how-it-works direction accepted by user as promising. Hero tertiary CTA removed. |
| `run-2` | Not started |                                                                                                                              |                                                                                                                             |                                                                                                    |
| `run-3` | Not started |                                                                                                                              |                                                                                                                             |                                                                                                    |
| `run-4` | Not started |                                                                                                                              |                                                                                                                             |                                                                                                    |
| `run-5` | Not started |                                                                                                                              |                                                                                                                             |                                                                                                    |
| `run-6` | Not started |                                                                                                                              |                                                                                                                             |                                                                                                    |

## Self-Reflection / Instruction Improvements

- Future landing work should treat `2026-04-27-full-text-page-copy.md` as the
  copy source of truth, while allowing user-approved removals such as the hero
  tertiary CTA.
- The bright optimistic style should become landing-specific guidance after the
  full page proves coherent in browser; root `DESIGN.md` is currently EweNote
  product UI guidance and should not be treated as the landing style source.
