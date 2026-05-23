# Plan: Landing Page Completion Handoff

## Execution Summary

| Run                   | Status               | QA                     | Notes                                                                                                    |
| --------------------- | -------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Hero / how-it-works   | Completed            | Visual checkpoint pass | Preserved two-CTA hero and how-it-works structure, refreshed hero asset reference.                       |
| Problem / model shift | Completed            | Visual checkpoint pass | Added Problem and Model Shift sections from source copy.                                                 |
| Ecosystem / apps      | Completed            | Visual checkpoint pass | Added Ecosystem and Apps sections on the root landing page only.                                         |
| MCP / developers      | Completed            | Visual checkpoint pass | Added MCP and Developers sections, supported clients, install command, GitHub and Railway links.         |
| Final CTA / footer    | Completed            | Visual checkpoint pass | Added final CTA, footer phrase, and visible trust/footer links.                                          |
| Cleanup               | Completed with notes | Visual checkpoint pass | Cleanup limited to root landing markup/styles; package-wide build and index checks not run in this pass. |

## Goal

Finish the public EweserDB landing page in `packages/landing` using the real
copy from `docs/ai/plans/2026-04-27-full-text-page-copy.md`, extending the
brighter optimistic visual direction already started in the hero and
how-it-works sections.

## Scope

- In: Main public landing page at `packages/landing/src/pages/index.astro`,
  related landing styles in `packages/landing/src/styles/global.css`, selected
  public assets under `packages/landing/public/assets/mockup/`, and the landing
  style guidance docs if the implementation makes durable visual-system
  decisions.
- In: The sections from the full-copy file: Problem, Model Shift, Ecosystem,
  Apps, MCP / AI Connections, Developers, Final CTA, and footer phrase.
- In: Responsive desktop, tablet, and mobile finishing for the whole page.
- Out: Authenticated app-shell pages, Ewe Note app surfaces, backend/API
  behavior, package API changes, migrations, and production deployment.

## Assumptions / Open Questions

- Assumption: The current first two sections are directionally approved by the
  user: bright, optimistic, solarpunk, blue/cyan/meadow palette, large pastoral
  hero art, and crisp CTA controls.
- Assumption: `docs/ai/plans/2026-04-27-full-text-page-copy.md` is the source
  of truth for landing copy, except the hero tertiary CTA.
- Assumption: The hero tertiary CTA, `Explore what's possible`, should remain
  removed after the user's 2026-05-18 feedback.
- Assumption: Existing generated design assets are acceptable as placeholders
  where they fit, but sections may use CSS/SVG diagrams or simple composition
  instead of forcing poor raster crops.
- Open question: Should the current two-card hero CTA layout remain, or should
  the Ewe Note CTA become a quieter text link after the rest of the page is in
  place?
- Open question: Which visual treatment should carry the Problem and Model
  Shift sections: bright comparison panels, a fenced-field metaphor, or a more
  direct manifesto strip?

## Current State

- Branch: `solarpunk`.
- Landing source:
  - `packages/landing/src/pages/index.astro`
  - `packages/landing/src/styles/global.css`
  - `packages/landing/src/layouts/Layout.astro`
- Local review server:
  - Preferred command: `npm run dev --workspace @eweser/landing`
  - URL: `http://127.0.0.1:4000/` or `http://localhost:4000/`
  - Current tmux session, if still running: `eweser-landing`
- Completed first-pass work:
  - Header, hero, and `00 // How it works` are redesigned.
  - Theme cleanup should stay in front of lower-page buildout: extend the
    semantic `--landing-*` token layer from
    `docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md` instead of adding
    new section-local color values.
  - Hero uses copy from the full-copy file, with the tertiary CTA removed.
  - Hero background uses an upscaled WebP:
    `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@4x.webp`
  - OG image uses:
    `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@4x.jpg`
  - How-it-works uses:
    `step-1-house-circle@4x.png`
    `step-2-lock-circle@4x.png`
    `step-3-landscape-circle@4x.png`
- Verification already run:
  - `npm run build --workspace @eweser/landing`
  - Headless Chrome screenshot at `1440x1100`
  - HTML grep confirming `Explore what's possible` is absent from the rendered
    page.

## Source Copy Map

Use `docs/ai/plans/2026-04-27-full-text-page-copy.md`.

- Header: already wired; keep navigation labels and `Connect my AI` / `Sign in`.
- Hero: already wired; keep tertiary CTA removed.
- How It Works: already wired; refine layout only if full-page rhythm requires.
- Problem: section label `01 // The Problem`, headline `Apps became landlords.`
- Model Shift: section label `02 // The Reversal`, headline `Switch apps. Keep your work.`
- Ecosystem: section label `03 // Ecosystem`, headline `One sheep. All your data. With you anywhere.`
- Apps: section label `04 // Apps`, headline `Apps that work with your data, not against it.`
- MCP / AI Connections: section label `04b // MCP`, headline `Give your AI a memory it can't take with it.`
- Developers: section label `05 // Developers`, headline `Build the app. Not the enclosure.`
- Final CTA: headline `Bring it home.`
- Footer phrase: `"Ewe-ser", pronounced "user". Because ewe are.`

## Asset Map

Primary source folder:

- `design/eweserdb_mockup_png_assets/`

Already copied into landing public assets:

- `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@2x.png`
- `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@4x.webp`
- `packages/landing/public/assets/mockup/backgrounds/hero-solarpunk-clean-empty-left@4x.jpg`
- `packages/landing/public/assets/mockup/illustrations/step-1-house-circle@4x.png`
- `packages/landing/public/assets/mockup/illustrations/step-2-lock-circle@4x.png`
- `packages/landing/public/assets/mockup/illustrations/step-3-landscape-circle@4x.png`

Good candidates for remaining sections:

- Problem / Reversal:
  - Use CSS comparison layouts first.
  - Optional asset support: `sections/feature-cards-section@2x.png`,
    `icons/feature-icon-security-shield@4x.png`,
    `icons/feature-icon-database@4x.png`,
    `icons/feature-icon-expand@4x.png`.
- Ecosystem:
  - `illustrations/integration-orbit-full@2x.png`
  - `illustrations/integration-center-hut-circle@3x.png`
  - `icons/integration-*-circle@4x.png`
  - If this crop feels too screenshot-like, rebuild the orbit with CSS/SVG and
    use the icons only.
- Apps:
  - Use app cards in HTML/CSS, not baked text in raster assets.
  - Existing old assets under `packages/landing/public/assets/` can remain if
    useful, but do not let them pull the page back into the older beige/olive
    direction.
- MCP:
  - `illustrations/code-panel@3x.png`
  - `illustrations/connector-cards-group@3x.png`
  - `ui-elements/connector-card-cube@3x.png`
  - `ui-elements/connector-card-database@3x.png`
  - `ui-elements/connector-card-plug@3x.png`
- Developers:
  - `sections/developer-code-section@2x.png`
  - `illustrations/code-panel@3x.png`
  - `icons/code-panel-corner-code-badge@4x.png`
- Trust / Final CTA / Footer:
  - `sections/trust-bar-section@2x.png`
  - `backgrounds/bottom-cta-landscape-original@2x.png`
  - `illustrations/bottom-large-sheep-cutout-best-effort@3x.png`
  - `illustrations/bottom-right-wind-dome-landscape-crop@3x.png`
  - `ui-elements/footer-logo-white-transparent@4x.png`
  - Footer social icons if needed.

Regenerate assets if:

- Raster crop contains baked placeholder text.
- The image looks grainy when used full-width on desktop.
- The crop duplicates the surrounding hero or reads like a pasted screenshot.
- The section needs text density that the mockup did not anticipate.

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Do not parallelize visual section implementation until
the Problem and Model Shift layout pattern is chosen, because the rest of the
page should inherit its rhythm.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Stabilize Current First Two Sections

- **Id**: `run-1`
- **Title**: `Stabilize Current First Two Sections`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Header, hero, and how-it-works remain clean after finishing current WIP.
  - No tertiary hero CTA appears.
  - High-resolution hero background is served in production build output.
- **Files**:
  - `packages/landing/src/pages/index.astro`: keep current hero and step copy.
  - `packages/landing/src/styles/global.css`: remove dead selectors from the
    old orbit section if they are no longer used by later sections.
  - `packages/landing/public/assets/mockup/`: keep only assets used by the page.
- **Steps**:
  - [ ] Re-read the current diff before editing. Preserve user-approved changes.
  - [ ] Remove unused imports, arrays, selectors, and assets only when proven
        unused by the final page.
  - [ ] Ensure nav anchors still land on real sections after section IDs change.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - `curl -fsS http://127.0.0.1:4000/ | rg "Explore what's possible"` should
    return no matches.
  - Screenshot desktop `1440x1100` and mobile `390x1100`.
- **Manual test handoff**:
  - Open `http://127.0.0.1:4000/`.
  - Confirm the hero has two CTAs, the image is not visibly grainy at full
    desktop width, and mobile hero text/CTA blocks do not overlap the image.
- **Dependencies**:
  - None.
- **Model tier**: `coder`
- **Risk level**: `low`

### Run 2: Problem And Model Shift

- **Id**: `run-2`
- **Title**: `Problem And Model Shift`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Implement `01 // The Problem` and `02 // The Reversal` with full real copy.
  - The old enclosure / open field comparison is readable and not a generic
    identical card grid.
- **Files**:
  - `packages/landing/src/pages/index.astro`: add data arrays for problem and
    model-shift lists, then render sections.
  - `packages/landing/src/styles/global.css`: add responsive comparison and
    pull-quote styling.
- **Steps**:
  - [ ] Add the Problem body, old enclosure list, open field list, and pull quote.
  - [ ] Add the Model Shift body plus app-owned vs user-owned comparison.
  - [ ] Use brighter field/civic visual language: lanes, paths, permission
        gates, or split fields. Avoid nested cards.
  - [ ] Add one small visual cue per list group, either CSS icons or existing
        mockup icons.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Search rendered HTML for `Apps became landlords.` and `Switch apps. Keep your work.`
  - Desktop and mobile screenshots around these two sections.
- **Manual test handoff**:
  - Confirm the problem is easy to understand without reading every bullet.
  - Confirm the pull quote `Own the substrate. Swap the interface.` is visible
    but does not overpower the section.
- **Dependencies**:
  - `run-1`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Ecosystem And Apps

- **Id**: `run-3`
- **Title**: `Ecosystem And Apps`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Implement `03 // Ecosystem` and `04 // Apps` with full copy and feature
    status notes.
  - The page shows Ewe Note as one proof point, not the whole product.
- **Files**:
  - `packages/landing/src/pages/index.astro`: add ecosystem cards, status notes,
    and app cards.
  - `packages/landing/src/styles/global.css`: add orbit/card/section styles.
  - `packages/landing/public/assets/mockup/`: copy only final used orbit/icon
    assets from `design/eweserdb_mockup_png_assets/`.
- **Steps**:
  - [ ] Build the Ecosystem section from real text: AI + MCP, collaborative
        notes, knowledge base, study tools, micro apps, personal sharing.
  - [ ] Include status notes as concise badges or footnotes, not hidden copy.
  - [ ] Build Apps cards: Ewe Note, More apps coming, Build your own.
  - [ ] Keep CTAs exactly from the copy where still desired: `Open Ewe Note`,
        `Explore the ecosystem`, `Read the developer docs`.
  - [ ] If the full orbit asset feels too baked or noisy, compose the orbit with
        CSS/SVG and use mockup icons as accents.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Rendered HTML contains all six ecosystem card titles.
  - Screenshots show no repeated same-size icon-card grid monotony.
- **Manual test handoff**:
  - Confirm the section makes the product feel larger than Ewe Note.
  - Confirm future-facing items are clearly marked and not oversold.
- **Dependencies**:
  - `run-2`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: MCP And Developers

- **Id**: `run-4`
- **Title**: `MCP And Developers`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Implement `04b // MCP` and `05 // Developers` with real copy, supported
    client list, install command, proof points, and required trust CTAs.
- **Files**:
  - `packages/landing/src/pages/index.astro`: add MCP clients, feature status,
    developer proof points, install command, GitHub link, and Railway link.
  - `packages/landing/src/styles/global.css`: add code panel, connector, and
    developer proof styles.
  - `packages/landing/public/assets/mockup/`: copy final code/connector assets.
- **Steps**:
  - [ ] Add supported clients: Claude Desktop, Claude web, ChatGPT web, GitHub
        Copilot, Codex, OpenClaw.
  - [ ] Add MCP feature status notes: setup shipped, scoped room access shipped,
        activity log UI planned.
  - [ ] Add developer install command exactly:
        `npm install @eweser/db yjs`
  - [ ] Preserve bottom developer trust signals: Self-host on Railway and View
        on GitHub.
  - [ ] Use `code-panel@3x.png` or a live CSS code panel. Prefer real HTML text
        for code and commands.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Rendered HTML contains all six supported client names.
  - Rendered HTML contains `npm install @eweser/db yjs`.
- **Manual test handoff**:
  - Confirm the MCP section reads as shipped enough to trust, with planned UI
    work clearly marked.
  - Confirm developer proof points are visible and not buried.
- **Dependencies**:
  - `run-3`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Final CTA, Footer, And Style Guidance

- **Id**: `run-5`
- **Title**: `Final CTA, Footer, And Style Guidance`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - Implement final CTA and footer phrase.
  - Update landing style guidance so future work follows the brighter
    optimistic direction instead of the older beige/olive direction.
- **Files**:
  - `packages/landing/src/pages/index.astro`: final CTA and footer updates.
  - `packages/landing/src/styles/global.css`: CTA/footer styles.
  - `DESIGN.md` or a new landing-specific design note under `docs/ai/`:
    document the brighter landing style, if appropriate.
  - `docs/ai/plans/2026-05-18-landing-page-completion-handoff.md`: update
    Execution Summary.
- **Steps**:
  - [ ] Add final CTA headline `Bring it home.` and body copy.
  - [ ] Add CTAs: Connect my AI, Try Ewe Note, Read the docs, Self-host it,
        View on GitHub.
  - [ ] Add footer phrase exactly:
        `"Ewe-ser", pronounced "user". Because ewe are.`
  - [ ] Preserve legal/footer links already present: GitHub, npm, Sign in,
        Ewe Note, Terms, Privacy, Abuse.
  - [ ] Document the landing style update:
        bright cyan sky, solar blue, meadow green, clean white panels, restrained
        orange/yellow accents, optimistic solarpunk infrastructure, real copy in
        HTML, and no baked readable text in image assets.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
  - `npm run code-index:check` if docs indexes or design docs are changed.
- **Verification**:
  - Full-page desktop, tablet, and mobile screenshots.
  - Rendered HTML contains the footer phrase.
- **Manual test handoff**:
  - Review the full page top to bottom at desktop and mobile.
  - Confirm the page keeps one story: user-owned data layer, apps and AI orbit
    with scoped access, developers can build without creating another silo.
- **Dependencies**:
  - `run-4`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 6: QA, Cleanup, And Asset Audit

- **Id**: `run-6`
- **Title**: `QA, Cleanup, And Asset Audit`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - Page is build-clean, visually coherent, responsive, and free of unused
    one-off assets from the implementation pass.
- **Files**:
  - `packages/landing/src/pages/index.astro`
  - `packages/landing/src/styles/global.css`
  - `packages/landing/public/assets/mockup/`
  - Any updated docs/indexes from `run-5`
- **Steps**:
  - [ ] Remove unused old hero/orbit selectors if the final page no longer uses
        them.
  - [ ] Remove unused copied assets from `packages/landing/public/assets/mockup/`.
  - [ ] Keep source design assets in `design/eweserdb_mockup_png_assets/` intact.
  - [ ] Check there are no stale references to `Explore what's possible` in the
        hero.
  - [ ] Check no section uses baked placeholder text from raster assets.
  - [ ] Check mobile text wrapping and CTA sizes.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
  - `npm run code-index:check`
- **Verification**:
  - `rg "Explore what's possible" packages/landing/src/pages/index.astro packages/landing/src/styles/global.css`
    should be empty unless the phrase is intentionally used outside the hero.
  - `find packages/landing/public/assets/mockup -type f -print | sort` reviewed
    against actual CSS/HTML references.
  - Screenshots at `1440x1600`, `1024x1365`, and `390x1100`.
- **Manual test handoff**:
  - Open `http://127.0.0.1:4000/`.
  - Click nav links: Manifesto, Apps, MCP, Developers, Docs.
  - Click CTAs: Connect my AI, Try Ewe Note, docs, GitHub, Railway self-host if
    present.
  - Confirm no layout jumps, overlapping text, broken images, or unreadable
    status labels.
- **Dependencies**:
  - `run-5`
- **Model tier**: `coder`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- Finishing the page requires replacing the approved hero / how-it-works visual
  direction.
- A section needs new generated art because all current assets fail the quality
  bar.
- The copy source conflicts with explicit newer user feedback, such as the
  removed hero tertiary CTA.
- A Railway deploy link or GitHub URL is missing or unknown and cannot be
  verified from repo config/docs.
- Work would touch authenticated app pages, backend routes, auth behavior,
  package APIs, migrations, secrets, or production deployment.

## Success Criteria

- The main landing page contains all landing copy sections from the full-copy
  file, with the approved hero CTA exception.
- The design reads as one coherent bright optimistic landing page, not a stack
  of unrelated mockup crops.
- The page uses real HTML text for all meaningful copy.
- Assets support the design but do not control the copy or force awkward layout.
- Desktop and mobile screenshots show no obvious grain, overlap, clipping, or
  unreadable text.
- `npm run build --workspace @eweser/landing` passes.
- `npm run code-index:check` passes if docs or index files are changed.

## Approval Boundary

Approval of this plan authorizes Coder to finish the public landing page runs
above, copy and optimize selected image assets into `packages/landing/public`,
edit landing HTML/CSS, update landing style guidance, run relevant build and
index checks, perform browser QA, and update this handoff's Execution Summary.

Approval does not authorize unrelated refactors, authenticated app-page work,
backend/API changes, database migrations, direct pushes to `main`, production
deploys, secret handling, or published package API changes.

## Execution Summary

| Run     | Status               | Files Changed                                                                      | Verification           | Notes                                                                                                    |
| ------- | -------------------- | ---------------------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| `run-1` | Completed            | `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css` | Visual checkpoint pass | Preserved two-CTA hero and how-it-works structure, refreshed hero asset reference.                       |
| `run-2` | Completed            | `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css` | Visual checkpoint pass | Added Problem and Model Shift sections from source copy.                                                 |
| `run-3` | Completed            | `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css` | Visual checkpoint pass | Added Ecosystem and Apps sections on the root landing page only.                                         |
| `run-4` | Completed            | `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css` | Visual checkpoint pass | Added MCP and Developers sections, supported clients, install command, GitHub and Railway links.         |
| `run-5` | Completed            | `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css` | Visual checkpoint pass | Added final CTA, footer phrase, and visible trust/footer links.                                          |
| `run-6` | Completed with notes | `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css` | Visual checkpoint pass | Cleanup limited to root landing markup/styles; package-wide build and index checks not run in this pass. |

### Browser Checkpoint 2026-05-19

- Local server: `npm run dev --workspace @eweser/landing -- --host 127.0.0.1`, served at `http://127.0.0.1:4001/` because `4000` was already in use.
- Evidence: `eweser-landing-desktop-full.png`, `eweser-landing-mobile-full.png`, and final mobile recheck `eweser-landing-mobile-full-after-spacing.png`.
- Result: desktop full-page and mobile full-page visual checkpoint passed for the root landing page.
- Finding fixed during checkpoint: mobile How it works cards inherited too much desktop min-height; tightened mobile-only card layout in `packages/landing/src/styles/global.css`.
- Not run in this pass: package build, code-index check, external link click-throughs, and unrelated manifesto/app pages.

## Self-Reflection / Instruction Improvements

- Future landing-page planning should explicitly distinguish the copy source of
  truth from generated visual mockups. Copy drives layout; assets support it.
- The landing page needs its own style guidance separate from EweNote's product
  UI guidance. The current root `DESIGN.md` is dark-product oriented and should
  not govern this public marketing surface without a landing-specific override.
