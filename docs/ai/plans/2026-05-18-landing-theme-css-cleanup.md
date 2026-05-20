# Plan: Landing Theme CSS Cleanup

## Goal

Refactor the landing page CSS so colors, buttons, section surfaces, shadows, and
asset treatments are controlled by clear semantic theme tokens, making it easy
to trial a green primary action color without chasing hardcoded Bootstrap-like
blue values through `global.css`.

## Scope

- In: Landing CSS in `packages/landing/src/styles/global.css`.
- In: Landing markup in `packages/landing/src/pages/index.astro` only where
  class names or a theme hook are needed for cleaner CSS.
- In: A small landing-specific style note if the final token contract needs to
  be documented for future page sections.
- Out: Auth app styles, Ewe Note styles, Tailwind config changes, backend code,
  generated image source files, and visual redesign beyond theme-token cleanup.

## Assumptions / Open Questions

- Assumption: The approved landing direction is bright, optimistic, solarpunk,
  with sky/cyan/meadow/solar accents.
- Assumption: The current primary button blue reads too close to default
  framework blue and should be easy to swap for green.
- Assumption: The landing page should keep blue/cyan as data-flow accents even
  if the primary action becomes green.
- Assumption: Raw OKLCH values should live mostly in token definitions, not in
  component selectors.
- Assumption: This cleanup should happen before finishing the rest of the
  landing page, so future sections do not add more one-off color choices.
- Open question: Should the default primary action become green immediately, or
  should the implementation expose both blue and green theme variants for review?
- Open question: Should the old pastoral token block be deleted in this pass, or
  temporarily kept until all older lower-page sections are rebuilt?

## Current CSS Findings

- `packages/landing/src/styles/global.css` currently has old tokens near the
  top, including `--paper`, `--olive`, `--sun`, `--water`, and `--leaf`.
- A newer bright landing token block is appended later, including `--sky-veil`,
  `--sky-open`, `--cloud`, `--blue`, `--blue-deep`, `--cyan`, `--meadow`,
  `--meadow-deep`, `--solar`, and `--orange`.
- Primary actions still hardcode blue OKLCH values in:
  - `.button-primary`
  - `.button-primary:hover`
  - `.hero-cta-primary`
  - `.hero-cta:hover`
- Some blue is semantic and should stay blue: sky, data-flow paths, orbit dots,
  and technical diagram accents.
- Some blue is action color and should move behind semantic tokens:
  primary CTA background, hover, border, shadow, and primary CTA text accents.

## Target Token Contract

Use palette tokens for brand colors and semantic tokens for component decisions.
Suggested shape:

```css
:root {
  /* Palette */
  --landing-sky-veil: oklch(...);
  --landing-sky-open: oklch(...);
  --landing-cloud: oklch(...);
  --landing-ink: oklch(...);
  --landing-cyan: oklch(...);
  --landing-meadow: oklch(...);
  --landing-solar: oklch(...);
  --landing-orange: oklch(...);

  /* Semantic action theme */
  --landing-action: oklch(0.56 0.15 150);
  --landing-action-strong: oklch(0.41 0.13 151);
  --landing-action-hover: oklch(0.62 0.16 150);
  --landing-action-border: oklch(0.34 0.11 151);
  --landing-action-shadow: oklch(0.38 0.12 151 / 0.24);
  --landing-action-text: oklch(0.988 0.012 150);
  --landing-action-muted-text: oklch(0.91 0.045 150);

  /* Semantic surfaces */
  --landing-surface-page: var(--landing-cloud);
  --landing-surface-panel: oklch(...);
  --landing-surface-panel-hover: oklch(...);
  --landing-border-soft: oklch(...);
  --landing-border-strong: oklch(...);
  --landing-radius-control: 8px;
  --landing-shadow-control: ...;
}
```

The exact values should be tuned in browser, but the primary green starting
point should be:

```css
--landing-action: oklch(0.56 0.15 150);
--landing-action-strong: oklch(0.41 0.13 151);
--landing-action-hover: oklch(0.62 0.16 150);
--landing-action-border: oklch(0.34 0.11 151);
--landing-action-shadow: oklch(0.38 0.12 151 / 0.24);
```

## Runs

## Run Order And Manual Test Handoffs

Run order: sequential. Do this before continuing the full landing-page buildout
from `docs/ai/plans/2026-05-18-landing-page-completion-handoff.md`.

After each completed run, Coder must update the Execution Summary and add a
manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Token Inventory And Baseline

- **Id**: `run-1`
- **Title**: `Token Inventory And Baseline`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - A small inventory of current landing tokens, hardcoded OKLCH action colors,
    and selectors that need migration.
- **Files**:
  - `docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md`: update Execution
    Summary with inventory notes.
- **Steps**:
  - [ ] Inspect `packages/landing/src/styles/global.css` for all custom
        properties and direct action-color OKLCH values.
  - [ ] Classify each found color as palette, semantic action, semantic surface,
        semantic text, diagram/accent, or legacy.
  - [ ] Capture baseline desktop and mobile screenshots before changing values.
  - [ ] Confirm current local server URL with `lsof` and `curl` before browser
        screenshots.
- **Tests**:
  - Not needed for inventory.
- **Verification**:
  - `rg -n -- "--[a-z0-9-]+:|button-primary|hero-cta-primary|oklch\\([^)]*263" packages/landing/src/styles/global.css`
- **Manual test handoff**:
  - Not needed: this run records a baseline and does not change behavior.
- **Dependencies**:
  - None.
- **Model tier**: `fast`
- **Risk level**: `low`

### Run 2: Create Landing Theme Token Layer

- **Id**: `run-2`
- **Title**: `Create Landing Theme Token Layer`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - A single landing theme token block with palette tokens and semantic tokens,
    including green action tokens.
- **Files**:
  - `packages/landing/src/styles/global.css`: consolidate landing token
    definitions into one named block.
- **Steps**:
  - [ ] Add `--landing-*` palette tokens for sky, cloud, ink, cyan, meadow,
        solar, orange, border, and radius.
  - [ ] Add `--landing-action-*` tokens for primary CTA background, strong stop,
        hover, border, shadow, foreground, and muted foreground.
  - [ ] Add `--landing-surface-*`, `--landing-border-*`,
        `--landing-shadow-*`, and `--landing-control-*` tokens for reusable
        section and control styling.
  - [ ] Keep old token names temporarily as aliases if lower-page sections still
        depend on them, for example `--blue: var(--landing-data-blue)`.
  - [ ] Put a short comment above the token block explaining palette vs semantic
        token usage.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - Build passes before selector migration.
  - Current page should remain visually unchanged except for any explicit green
    action token trial if selected by the user.
- **Manual test handoff**:
  - Open `http://127.0.0.1:4000/`.
  - Confirm no obvious visual regression in hero, nav, and how-it-works.
- **Dependencies**:
  - `run-1`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 3: Migrate Primary Action Components

- **Id**: `run-3`
- **Title**: `Migrate Primary Action Components`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Primary buttons and primary hero CTA use semantic action tokens only.
- **Files**:
  - `packages/landing/src/styles/global.css`: update `.button-primary`,
    `.button-primary:hover`, `.hero-cta-primary`, `.hero-cta-primary small`,
    and primary CTA hover/focus styles.
- **Steps**:
  - [ ] Replace hardcoded blue border/background/shadow values in primary
        buttons with `--landing-action-*` variables.
  - [ ] Replace primary CTA muted text with `--landing-action-muted-text`.
  - [ ] Add `:focus-visible` styling that uses action tokens and remains
        accessible.
  - [ ] Keep data/orbit hover accents on blue/cyan tokens where they represent
        data flow rather than an action.
  - [ ] If green is the default trial, set the default action tokens to green.
        If not, add a temporary class or documented alternate token block for
        comparing blue vs green in browser.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - `rg -n "oklch\\([^)]*263|var\\(--blue\\)|var\\(--blue-deep\\)" packages/landing/src/styles/global.css`
    should not find primary button or primary CTA action styling.
  - Desktop and mobile screenshots show CTA contrast remains readable.
- **Manual test handoff**:
  - Compare the hero before and after.
  - Confirm the primary CTA no longer reads as Bootstrap blue.
  - Confirm the primary CTA still has stronger visual priority than `Try Ewe Note`.
- **Dependencies**:
  - `run-2`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 4: Migrate Surfaces, Text, Borders, And Shadows

- **Id**: `run-4`
- **Title**: `Migrate Surfaces Text Borders And Shadows`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Landing hero, nav, CTA cards, orbit note, how-it-works section, and controls
    use semantic tokens instead of scattered raw OKLCH values.
- **Files**:
  - `packages/landing/src/styles/global.css`: migrate remaining top-section
    raw color values where reasonable.
- **Steps**:
  - [ ] Replace repeated page/surface/background OKLCH values with
        `--landing-surface-*` variables.
  - [ ] Replace repeated border values with `--landing-border-*` variables.
  - [ ] Replace repeated shadows with `--landing-shadow-*` variables.
  - [ ] Replace text colors with `--landing-text-*` variables.
  - [ ] Leave complex image overlays and decorative gradients as local values
        only when a semantic token would make the code less clear.
  - [ ] Add comments only for intentional exceptions.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
- **Verification**:
  - `rg -n "oklch\\(" packages/landing/src/styles/global.css` should show most
    color values concentrated in the token block and a small number of justified
    local visual effects.
  - Screenshot desktop and mobile.
- **Manual test handoff**:
  - Confirm the page still matches the approved bright direction.
  - Confirm section backgrounds and text contrast remain stable after token
    migration.
- **Dependencies**:
  - `run-3`
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 5: Add Theme Trial Documentation

- **Id**: `run-5`
- **Title**: `Add Theme Trial Documentation`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - A short documented contract for adjusting landing colors without editing
    component selectors.
- **Files**:
  - `docs/ai/plans/2026-05-18-landing-page-completion-handoff.md`: add a note
    that theme cleanup should be completed before lower-page buildout, if this
    plan is approved.
  - `docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md`: update Execution
    Summary.
  - Optional: landing-specific design note if created by the implementation run.
- **Steps**:
  - [ ] Document how to change the primary CTA color by editing only
        `--landing-action-*` tokens.
  - [ ] Document which tokens are palette accents and should not be used for
        primary actions directly.
  - [ ] Document that blue/cyan remain data-flow colors, while green can carry
        the primary action.
  - [ ] Add the selected green token values as the first recommended alternate
        if the default stays blue.
- **Tests**:
  - `npx prettier --check docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md docs/ai/plans/2026-05-18-landing-page-completion-handoff.md docs/ai/plans/README.md`
  - `npm run code-index:check` if indexes or links change.
- **Verification**:
  - Docs links resolve locally.
- **Manual test handoff**:
  - Not needed: documentation-only run.
- **Dependencies**:
  - `run-4`
- **Model tier**: `fast`
- **Risk level**: `low`

### Run 6: Cleanup And Regression Pass

- **Id**: `run-6`
- **Title**: `Cleanup And Regression Pass`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `full`
- **Deliverable**:
  - CSS is easier to theme, build-clean, and visually verified in browser.
- **Files**:
  - `packages/landing/src/styles/global.css`
  - `packages/landing/src/pages/index.astro`, only if class names were changed.
  - Relevant docs from `run-5`.
- **Steps**:
  - [ ] Remove obsolete aliases only after confirming no selector uses them.
  - [ ] Group CSS sections in a readable order: imports, base tokens, legacy
        aliases if needed, base elements, components, sections, responsive.
  - [ ] Check `:focus-visible`, hover, and active states for primary and
        secondary buttons.
  - [ ] Check desktop `1440x1100`, tablet `1024x1365`, and mobile `390x1100`.
  - [ ] Update Execution Summary with final chosen default action color.
- **Tests**:
  - `npm run build --workspace @eweser/landing`
  - `npx prettier --check docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md docs/ai/plans/README.md`
  - `npm run code-index:check`
- **Verification**:
  - Screenshots show no CTA contrast regression or layout overlap.
  - Primary color can be changed by editing action tokens only.
- **Manual test handoff**:
  - Open the local landing page.
  - Toggle the `--landing-action-*` values between the blue baseline and green
    trial.
  - Confirm only primary action styling changes, while data-flow blue/cyan
    accents remain intact.
- **Dependencies**:
  - `run-5`
- **Model tier**: `coder`
- **Risk level**: `medium`

## Stop Conditions

Stop and ask for user approval if:

- The cleanup requires rewriting unrelated lower-page sections before the
  landing completion plan is approved.
- Token migration would remove or substantially alter the approved first two
  sections.
- A Tailwind config or build-system change appears necessary.
- The green action color cannot meet accessible contrast without changing the
  button copy color, size, or surrounding layout.
- Verification exposes a blocking visual regression that cannot be fixed within
  this CSS cleanup scope.

## Approval Boundary

Approval of this plan authorizes Coder to refactor landing CSS token usage,
introduce semantic landing theme variables, migrate primary action and
top-section styling to those variables, run relevant landing build and browser
checks, update focused docs, and update this plan's Execution Summary.

Approval does not authorize changing app/backend behavior, modifying auth or
MCP flows, rewriting unrelated product UI, changing generated source assets,
deploying, pushing to `main`, or making package API changes.

## Execution Summary

Baseline inventory and evidence:

- Active landing CSS started with two theme layers in
  `packages/landing/src/styles/global.css`: the original pastoral variables
  near the top and a later bright-theme override block appended near the end.
- Hardcoded action blue still lived in `.button-primary`,
  `.button-primary:hover`, `.hero-cta-primary`, and `.hero-cta-primary small`.
- Runtime orientation initially reported unknown endpoints, so the landing app
  was started locally with `npm run dev --workspace @eweser/landing`, then
  `http://127.0.0.1:4000/` and `http://localhost:4000/` both returned
  `HTTP/1.1 200 OK`.
- Baseline screenshots were captured at `1440x1100`, `1024x1365`, and
  `390x1100` in:
  `landing-css-baseline-desktop-1440x1100.png`,
  `landing-css-baseline-tablet-1024x1365.png`, and
  `landing-css-baseline-mobile-390x1100.png`.

Completed runs:

- `run-1`: Completed. Files changed:
  `docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md`. Verification:
  `rg -n -- "--[a-z0-9-]+:|button-primary|hero-cta-primary|oklch\\([^)]*263" packages/landing/src/styles/global.css`
  plus baseline browser screenshots. Notes: captured the duplicated token-layer
  baseline and confirmed that the old primary action blue was still hardcoded
  in the live CTA selectors.
- `run-2`: Completed. Files changed:
  `packages/landing/src/styles/global.css`. Verification:
  `npm run build --workspace @eweser/landing`. Notes: added a semantic
  `--landing-*` theme layer for palette, action, surface, text, border, and
  shadow decisions, with legacy aliases retained for unfinished lower sections.
- `run-3`: Completed. Files changed:
  `packages/landing/src/styles/global.css`. Verification:
  `rg -n "oklch\\([^)]*263|var\\(--blue\\)|var\\(--blue-deep\\)" packages/landing/src/styles/global.css`.
  Notes: migrated primary nav, hero, and closing CTAs to
  `--landing-action-*` tokens; green is now the default trial color and the
  focus-visible state uses the shared action ring.
- `run-4`: Completed. Files changed:
  `packages/landing/src/styles/global.css`. Verification: desktop, tablet, and
  mobile screenshots after refactor. Notes: moved nav, hero, orbit note,
  how-it-works surfaces, borders, shadows, and text onto semantic tokens while
  keeping complex lower-page legacy styling on aliases for now.
- `run-5`: Completed. Files changed:
  `docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md`,
  `docs/ai/plans/2026-05-18-landing-page-completion-handoff.md`.
  Verification: plan docs updated with token guidance. Notes: documented that
  future lower-page landing work should extend the semantic token layer rather
  than add new one-off color choices.
- `run-6`: Completed. Files changed:
  `packages/landing/src/styles/global.css`,
  `docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md`,
  `docs/ai/plans/2026-05-18-landing-page-completion-handoff.md`.
  Verification: `npm run build --workspace @eweser/landing`; browser
  screenshots at `1440x1100`, `1024x1365`, and `390x1100`;
  `npx prettier --check docs/ai/plans/2026-05-18-landing-theme-css-cleanup.md docs/ai/plans/2026-05-18-landing-page-completion-handoff.md docs/ai/plans/README.md`;
  `npm run code-index:check`. Notes: final regression pass kept the page stable
  across breakpoints and confirmed the primary action color can now be changed
  by editing token values instead of selector bodies.

Manual test handoff:

- Start `npm run dev --workspace @eweser/landing` and open
  `http://127.0.0.1:4000/`.
- Edit only the `--landing-action-*` values in
  `packages/landing/src/styles/global.css`.
  Expected: the nav `Connect my AI` button, the hero primary CTA, and the final
  CTA update together; the secondary CTA and blue/cyan data-flow accents stay
  independent.
- Re-check the page at `1440x1100`, `1024x1365`, and `390x1100`.
  Expected: no CTA overlap, hero copy remains readable, and the
  how-it-works layout stays inline on desktop and stacked on mobile.
- Known gap: lower legacy sections still inherit through alias variables and
  the earlier portion of `global.css` still contains older raw OKLCH values.
  A later full-page cleanup can remove those once the remaining sections are
  rebuilt on the new token contract.

## Self-Reflection / Instruction Improvements

- When landing CSS is mid-redesign, define the semantic token layer and the
  temporary legacy aliases first. That keeps new sections clean without forcing
  a risky one-pass rewrite of every older selector in the same turn.
