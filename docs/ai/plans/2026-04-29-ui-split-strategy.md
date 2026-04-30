# Plan: Landing vs App UI Split Strategy

## Goal

Ship a visually coherent EweserDB by accepting that the landing page and the core app are two different design problems, and solving each with the right workflow — not a shared Figma-first pipeline.

## The Problem with the Current Workflow

The Stitch → Figma (via Codex) → code pipeline produces ugly results because:

1. **Stitch compositions are screenshot-quality, not component-quality.** They optimize for a single dramatic viewport, not a repeatable system. Spacing, type sizes, and placement are tuned for effect, not for reuse.
2. **Codex in Figma reproduces what it sees, not what it means.** It assigns auto-layout constraints, component instances, and sizing rules based on visual geometry. When the visual geometry is arbitrary (as Stitch compositions often are), Codex guesses wrong, and the result looks broken.
3. **Every translation step compounds loss.** Stitch → Figma adds one interpretation gap. Figma → code adds another. A three-step pipeline from a compositional sketch to production UI is too lossy for this kind of editorial design.

## The Split

### Landing page (`packages/landing` — Astro)

The Soviet/revolutionary aesthetic works here because:

- It is a static marketing surface, not a functional control plane
- Every section can be an individual composition without needing full component consistency
- Astro + Tailwind lets you implement it directly from Stitch references without an intermediate layer

**Workflow for the landing page:**

1. Use Stitch screenshots as _reference images_, not as Figma deliverables
2. Implement sections directly in Astro/HTML/Tailwind with a human designer's eye
3. Skip Figma for the landing page entirely — it adds no value here and only introduces translation loss
4. Use Codex/AI for HTML/Tailwind implementation _after_ you have a clear written spec (from the copy deck + Stitch reference), not to generate the design decisions

### Core React app (`packages/app`, `packages/ewe-note`)

The editorial aesthetic fails here because:

- Users spend extended time in the app — aggressive contrast and manifesto typography cause fatigue
- Form elements, data tables, status indicators, and permission controls need to be readable and predictable
- The current shadcn-style CSS variable system in `packages/app/src/index.css` is already a good foundation

**Direction for the app:** Clean, disciplined, slightly warmer than generic shadcn — not boring, just not a propaganda poster.

The connection to the brand comes through three shared elements only:

- **Display font**: Use a condensed/bold display font (e.g., `Barlow Condensed`, `Space Grotesk Bold`) for page titles and section headings only — same font used in landing headlines, creating visual family without transferring the aesthetic
- **Primary red accent**: `--primary` should shift from the current blue (`hsl(224 40% 47%)`) to a desaturated brand red (`hsl(0 65% 45%)` — readable on dark backgrounds, not screaming). This makes CTAs and active states feel like the same brand.
- **8px grid + same border radius** as landing components

## Scope

In:

- New workflow recommendation for landing page (Stitch-reference → direct Astro implementation)
- Updated CSS design tokens for `packages/app` (typography + primary color)
- Shared token bridge document for consistent feel across surfaces
- Implementation plan for landing page sections

Out:

- Figma design system work (deprioritized — the pipeline is broken, fix the output first)
- Ewe Note redesign
- Full authenticated surface redesign (covered in `2026-04-27-authenticated-surfaces-design-pass.md`)

## Runs

### Run 1: App design tokens update

- **Recommended Agent**: `02-coder` (fast)
- **Reason**: Mechanical CSS variable changes with clear before/after — no design decisions needed in code
- [ ] Update `packages/app/src/index.css`:
  - Shift `--primary` from blue to brand red
  - Add a CSS custom property `--display-font` that the app can use for headings
  - Keep all other tokens stable (dark background, muted grays, etc.)
- [ ] Update `packages/ewe-note` if it imports or re-declares the same tokens
- [ ] Verify in browser: auth pages, connect-ai page, account page should all render correctly with the new primary
- [ ] Files: `packages/app/src/index.css`, `packages/ewe-note/src/index.css` (if exists)

### Run 2: Landing page — hero and problem section

- **Recommended Agent**: `02-coder` (strong)
- **Reason**: Translating Stitch visual reference to Astro/Tailwind requires judgment about spatial composition
- [ ] Use `docs/ai/plans/2026-04-27-full-text-page-copy.md` as the content spec
- [ ] Use the attached Stitch screenshots as visual reference — match the _feeling_, not the pixel layout
- [ ] Implement hero section: kicker, headline, body, dual CTAs, diagram
- [ ] Implement problem section: two-column old-world / EweserDB-world comparison
- [ ] Implement model shift section: "Own the substrate" pull quote
- [ ] Files: `packages/landing/src/pages/index.astro`, `packages/landing/src/styles/global.css`
- [ ] Verify at 1440px and 390px (mobile)

### Run 3: Landing page — ecosystem, developers, and final CTA

- **Recommended Agent**: `02-coder` (fast)
- **Reason**: Follows the same Astro/Tailwind pattern established in Run 2
- [ ] Implement ecosystem cards section (6 cards)
- [ ] Implement developers section with code snippet
- [ ] Implement final CTA
- [ ] Preserve Railway deploy and GitHub links
- [ ] Files: `packages/landing/src/pages/index.astro`

### Run 4: Connected Tools page

- **Recommended Agent**: `02-coder` (fast)
- **Reason**: Mechanical — follows landing page patterns
- [ ] Implement `packages/landing/src/pages/connected-tools.astro` using copy from the copy deck
- [ ] Files: `packages/landing/src/pages/connected-tools.astro`

## Workflow Change (Not a Run — Process Guidance)

For future design work, use this pipeline instead of Stitch → Figma → code:

**Landing page (editorial)**:

```
Stitch screenshot (reference image)
  + Copy deck (written spec)
  → Direct Astro/Tailwind implementation
```

Skip Figma entirely for the landing page.

**App UI (functional)**:

```
Written spec (what this screen does, what it shows)
  + Design tokens (CSS variables already defined)
  + Radix primitives / existing ui.tsx components
  → Direct React/Tailwind implementation
```

Use Figma only as a _rough wireframe review_ tool, not as the design source of truth for implementation.

**If Figma is needed for stakeholder alignment or visual proofing:**
Use Figma at the _end_ of a section (screenshot the working code into Figma) rather than at the beginning. This keeps the canonical source in code.

## Token Bridge — Making the Two Surfaces Feel Related

Define these shared values in a token reference doc:

| Token        | Landing page value     | App value                          | Effect                                                  |
| ------------ | ---------------------- | ---------------------------------- | ------------------------------------------------------- |
| Display font | Barlow Condensed 800   | Barlow Condensed 700               | Same typographic family for titles                      |
| Brand red    | `#D42B2B` (full drama) | `hsl(0 65% 45%)` (muted, readable) | Same hue family, different intensity                    |
| Body font    | Inter                  | Inter                              | Identical                                               |
| Base radius  | sharp (0–2px borders)  | `0.75rem` (current)                | Intentional contrast: landing is sharp, app is friendly |
| Grid unit    | 8px                    | 8px                                | Same spatial rhythm                                     |

The result is that the landing feels like the brand manifesto and the app feels like the product that brand promises. They are related but different tools for different jobs.

## Risks

- **Red primary in the app**: test against contrast ratios (WCAG AA) for light and dark modes before shipping. The current blue primary passes. Red needs to be checked at the specific HSL value.
- **Font load**: Barlow Condensed is a Google Font, adds a request — acceptable tradeoff but worth noting.
- **Stitch reference fidelity**: "Match the feeling, not the pixel layout" requires human judgment. If a coding agent generates the landing sections without a human review pass, the output will regress toward generic. Plan for a visual review step before each section ships.

## Execution Summary

```
Run 1: App tokens (fast, no dependencies)
  └── Run 2: Landing hero + problem (strong, can start after Run 1 tokens confirm brand red)
        └── Run 3: Landing ecosystem + devs + CTA (fast, sequential after Run 2)
              └── Run 4: Connected Tools page (fast, sequential after Run 3)
```

Runs 2–4 are sequential because they build on the same Astro file and Tailwind config. Run 1 is independent and can be done first or in parallel.

## Illustration System

### Design language

Two visual registers, used in separate places:

**Spot illustrations** — Soviet/Maoist screenprint style. Used at large scale in empty states, page heroes, and onboarding moments. Never used as functional UI controls.

**Decorative geometry** — Starbursts, stars, slanted/cut background fields, diagonal rails. Used as section backgrounds and dividers on the landing page, and sparingly as page-hero accents inside the app. Implemented in CSS/SVG, not as raster images.

---

### Where to use spot illustrations in the app

| Surface                        | Subject                                          | Notes                       |
| ------------------------------ | ------------------------------------------------ | --------------------------- |
| Data Home — zero state         | Fist holding a key or a database cylinder        | Primary hero illustration   |
| Connect AI — setup complete    | Two raised fists / a handshake in the same style | Success/confirmation moment |
| Connected Apps — no apps yet   | A door with a heavy padlock                      | Empty state                 |
| Account Security — 2FA enabled | A shield with an official stamp                  | Confirmation state          |
| Sign in page — left panel      | The fist (existing asset)                        | Already fits                |
| 404 page                       | A broken chain                                   | Error state                 |

All illustrations sit at `w-32 h-32` to `w-48 h-48`. Never smaller than 80px or they compete with UI elements.

---

### Decorative geometry — CSS/SVG patterns

These motifs connect the landing page to the app without importing the full editorial aesthetic into functional UI:

**Starbursts**
Radiating lines from a center point. Used as background decoration on section dividers and page hero areas. Implemented as a CSS `conic-gradient` or inline SVG. On the landing page: full bleed. In the app: clipped to a `before:` pseudo-element on a hero card, opacity 6–10%.

```css
/* Starburst via conic-gradient */
.starburst {
  background: conic-gradient(
    from 0deg,
    transparent 0deg 8deg,
    var(--brand-red) 8deg 10deg,
    transparent 10deg 28deg,
    var(--brand-red) 28deg 30deg /* repeat every 20deg ... */
  );
}
```

**Stars**
4-point and 5-point stars used as stamped accents — placed at section corners, as bullet replacements on hero lists, or as divider ornaments. Generate as inline SVG path components. At 16–24px they work as decorative punctuation without competing with Lucide icons.

**Slanted / cut background fields**
Section backgrounds that transition at a diagonal angle instead of a horizontal line. On the landing page: full-width `clip-path: polygon(0 0, 100% 4%, 100% 100%, 0 96%)`. In the app: used on the Data Home hero panel top edge only, keeps the rest of the page flat.

```css
/* Diagonal cut field */
.cut-field {
  clip-path: polygon(0 0, 100% 5%, 100% 100%, 0 95%);
}

/* Single angled top edge only */
.cut-top {
  clip-path: polygon(0 4%, 100% 0, 100% 100%, 0 100%);
}
```

**Rules and rails**
Thin 1px horizontal or diagonal lines used as section separators, label underlines, and card accent borders. The landing page uses red rails; the app uses `--border` colored rails with a single red one as the active indicator.

---

### Stitch prompt templates

Use these to generate new spot illustrations. Always request 2-color (red + black/dark), high contrast, vector-clean output, then vectorize via vectorizer.ai.

**Generic base prompt:**

```
Soviet propaganda screenprint style illustration, 2-color only, deep red (#C0272D)
and near-black (#1A1A1A) on white background, high contrast, bold graphic shapes,
no gradients, no halftones, clean vector-ready linework, woodcut aesthetic,
heroic pose, [SUBJECT BELOW]
```

**Fist / data ownership:**

```
[base prompt] A raised fist gripping a small glowing database cylinder.
Power-to-the-user framing. Like a Soviet labor poster but the subject is
digital ownership. Circular composition, works as a standalone emblem.
```

**AI agent access:**

```
[base prompt] Two forearms reaching toward each other, one human and one
mechanical/robotic, not quite touching. Framing of controlled access and
cooperation, not merger. Rectangular composition, landscape.
```

**Empty / locked state:**

```
[base prompt] A heavy industrial door with a large padlock, slightly ajar,
light coming through the gap. Suggests permission and access.
Square composition.
```

**Security / 2FA:**

```
[base prompt] A shield with a bold official stamp or seal on its face.
Stamp text reads "VERIFIED". Worker's shield, not a heraldic crest.
Square composition, works at small sizes.
```

**Broken chain / error:**

```
[base prompt] A chain with one link broken open, the two halves pulling apart.
Freedom framing, not damage framing. Vertical composition.
```

**Star / starburst stamp:**

```
[base prompt] A bold 5-point star with radiating lines behind it, like a
propaganda stamp or medal. Standalone emblem, works at 24px as a decorative
accent and at 200px as a section hero element.
```

---

### SVG component convention

Save all illustrations to `packages/app/src/components/illustrations/` as React SVG components:

```tsx
// FistIllustration.tsx
export function FistIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* paths use currentColor for the red fill */}
    </svg>
  );
}
```

Usage:

```tsx
<FistIllustration className="text-primary w-40 h-40 opacity-90" />
```

`currentColor` on the main fill means the illustration inherits `--primary` and automatically adapts when the primary token changes.

---

## Status

- [ ] Approved by user
