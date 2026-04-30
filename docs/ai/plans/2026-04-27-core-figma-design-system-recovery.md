## Goal

Close the quality gap between the stronger Stitch visual explorations and the current EweserDB landing page / core UI components by creating a coherent Figma-first design system for the core EweserDB product.

The target is not "make the page prettier." The target is a reusable visual system that can produce a distinctive landing page, core product surfaces, and implementation-ready components without drifting into generic SaaS, disconnected poster art, or Ewe Note-specific UI.

## Scope (In / Out)

In:

- Audit the current Figma file, current landing page, existing core components, and Stitch references
- Extract the strongest usable visual language from the Stitch designs
- Define the EweserDB core art direction separately from Ewe Note
- Create or refine Figma tokens, type styles, component primitives, and landing/product modules
- Recompose the landing page from the system
- Define core product UI components for auth, personal data, connected apps, and MCP surfaces
- Implement the approved design direction in code after Figma is coherent
- Verify visual quality with screenshots before considering the pass complete

Out:

- Ewe Note redesign
- Full product implementation of every authenticated workflow
- New brand strategy unrelated to the current punk data-sovereignty direction
- One-off Stitch exports treated as production design
- Pixel-perfect implementation before the design system is stabilized

## Problem

The current design process is producing two different kinds of failure:

- Stitch creates stronger, more opinionated compositions, but does not maintain a coherent reusable component system.
- The current landing page and components are more structured, but feel flatter, safer, and less visually convincing than the Stitch direction.

This creates a wide delta between "exciting reference design" and "actual product system."

The next pass should stop treating each screen as a standalone design prompt. EweserDB needs a Figma core system first, then landing and product pages composed from that system.

## Design Thesis

EweserDB should feel like user-owned data infrastructure with a defiant editorial edge:

- Industrial, direct, and system-like
- Punk without becoming messy
- Product-grade, not poster-only
- Useful and legible before decorative
- Strong enough for marketing, restrained enough for authenticated surfaces

The core visual language should preserve the best Stitch traits:

- Red / black / paper contrast
- Industrial labels, stamps, panels, rails, and status strips
- Bold condensed manifesto typography
- Diagrams that make ownership and access visible
- Physical system metaphors: control panels, terminals, cards, permits, manifests, ledgers

But it should avoid the weak outcomes:

- Random box placement
- Overcrowded novelty UI
- Inconsistent spacing and type scale
- Components that only work once
- A landing page that looks like a generic SaaS page with red accents

## Source References

Primary Figma file:

- `https://www.figma.com/design/2Y8rOwlyFVT2jtTJMyY72V/EweserDB-Punk-Data-Sovereignty-Design-System--Copy-?node-id=2042-51&t=WGuFW4CRxHCyK1xT-4`

Adjacent plans:

- `docs/ai/plans/2026-04-27-landing-page-story-pass.md`
- `docs/ai/plans/2026-04-27-authenticated-surfaces-design-pass.md`

Relevant product surfaces:

- Landing page
- Core personal data home
- Connected apps and permissions
- MCP / AI access
- Auth and account trust pages

## Runs

### Run 0: Content Deck and Text-Only Structure

- Status: first pass complete; ready for review/editing
- Recommended Agent: planner / designer
- Steps / Files / Tests

Pin down the textual content and information architecture before more visual design work.

Deliver:

- A markdown copy deck for the core landing page and core product surfaces
- Section-by-section copy with headline, body, CTA, labels, cards, and product surface text
- A text-only / boxes-only Figma pass that validates hierarchy before final styling

Working file:

- `docs/ai/plans/2026-04-27-core-copy-deck.md`

Figma scratchpad:

- Page: `04 Text Structure` (`2218:2`)
- Frames:
  - `Landing / Text Structure / Desktop 1440` (`2218:3`)
  - `Landing / Text Structure / Mobile 390` (`2218:79`)
  - `Data Home / Text Structure / Desktop 1440` (`2218:155`)
  - `Connected Apps / Text Structure / Desktop 1440` (`2218:170`)
  - `MCP Access / Text Structure / Desktop 1440` (`2218:185`)
  - `Auth / Text Structure / Desktop 1440` (`2218:200`)

Acceptance criteria:

- The landing page can be read in markdown and still make sense
- Each product surface has clear purpose, labels, and user-facing copy before visual styling
- Figma can be composed as plain boxes and text without relying on decoration to explain the product
- Visual work resumes only after the message hierarchy feels right

### Run 1: Design Audit and Gap Diagnosis

- Status: in progress
- Recommended Agent: planner / designer
- Steps / Files / Tests

Inspect the Figma file, current landing page implementation, current component library, and Stitch reference frames.

Deliver:

- A short audit page or note in Figma listing what works, what fails, and what must become reusable
- A component inventory of current core UI primitives
- A visual delta list comparing Stitch references to the current landing page
- A decision on which elements belong to core EweserDB versus Ewe Note

Acceptance criteria:

- The team can name the exact missing system pieces instead of saying "make it nicer"
- The strongest Stitch traits are cataloged as reusable patterns, not copied as isolated screenshots

Scratchpad findings, 2026-04-27:

- Figma is not empty or merely exploratory. It already has four useful pages:
  - `00 Brand System`
  - `01 Components`
  - `02 Landing`
  - `03 Eweser Core`
- The linked frame is `02 Landing` -> `Landing Page / Desktop 1440 - Ecosystem Control Plane` (`2042:51`).
- `02 Landing` also has V2 and V3 variants:
  - `2114:2` — V2 adds more energy around the hero visual, product preview, developer band, and CTA through signal rails/backplates.
  - `2178:63` — V3 introduces yellow signal accents and more aggressive horizontal rails, but some metadata suggests off-canvas positioning in the use-case cards and CTA that needs visual checking before adopting.
- `01 Components` contains a real local component library named `Component Library / Punk System` with 49 local components.
- Local component sets already found:
  - `Button`
  - `Badge`
  - `Nav Item`
  - `Card`
  - `Section Header`
  - `Hero Panel`
  - `Network`
  - `Section Band`
  - `Feature Grid`
  - `CTA Band`
  - `Hero Layout`
- Platform/core components already found:
  - `Platform Header`
  - `Stat Tile`
  - `Management Row`
  - `Inspector Panel`
  - `Settings Group`
  - `Permission Foldout`
- Local token collection exists: `EweserDB Brand Tokens`.
- Local tokens already include:
  - `color/black`, `color/paper`, `color/white`, `color/red`, `color/ink`
  - semantic background tokens: `color/bg/base`, `color/bg/strong`, `color/bg/accent`, `color/bg/inverse`, `color/bg/signal`
  - text tokens: `color/text/primary`, `color/text/secondary`, `color/text/inverse`, `color/text/accent`
  - border tokens: `color/border/default`, `color/border/subtle`, `color/border/accent`, `color/border/signal`
  - spacing tokens: `space/4`, `space/8`, `space/12`, `space/16`, `space/20`, `space/24`, `space/32`, `space/48`, `space/64`
  - radius tokens: `radius/0`, `radius/8`, `radius/16`, `radius/full`
- Local text styles already include:
  - `EweserDB/Type/Manifesto Display`
  - `EweserDB/Type/Hero Display`
  - `EweserDB/Type/Heading`
  - `EweserDB/Type/Section Label`
  - `EweserDB/Type/Body`
  - `EweserDB/Type/Small Label`
  - `EweserDB/Display XL`
  - `EweserDB/Display LG`
  - `EweserDB/Heading LG`
  - `EweserDB/Heading MD`
  - `EweserDB/Body LG`
  - `EweserDB/Body MD`
  - `EweserDB/Label`
  - `EweserDB/Kicker`
  - `EweserDB/Meta`
- Local effect style exists: `EweserDB/Effect/Hard Shadow`.
- Figma file has community libraries attached, but the useful EweserDB-specific system is local, not Material/SDS.

Code audit notes:

- Current landing implementation is concentrated in `packages/landing/src/pages/index.astro`.
- The live/code landing page has the correct narrative sections from the story plan, but the visual language does not match the Figma component system closely enough.
- Code currently relies heavily on one-off Tailwind classes inside the Astro page rather than named EweserDB primitives.
- Code still has visual remnants that weaken the punk system:
  - slate/emerald palette in hero, problem, and developer areas
  - large rounded SaaS cards (`rounded-[1.75rem]`, `rounded-[2rem]`, soft glassy hero panel)
  - radial/glow background treatments and floating blur elements
  - pill/rounded UI where Figma mostly uses hard rectangular industrial controls and hard shadows
- `packages/landing/src/styles/global.css` imports Inter and defines motion/glow helpers, but no reusable EweserDB token layer yet.
- `packages/auth-pages/src/components/ui.tsx` uses generic shadcn-like primitives (`Button`, `Input`, `Card`, `Badge`) with blue/brown HSL tokens in `packages/auth-pages/src/index.css`.
- `packages/examples-components/src/components/styles.ts` still uses an older separate visual language (`#373d5e`, green highlight, inline React CSSProperties).
- Ewe Note has its own shadcn/Radix component folders and should not define the core EweserDB system.

Initial diagnosis:

- This is not a "no design system exists" problem. The Figma core system exists and should be the source of truth.
- The largest gap is between Figma and implementation.
- Secondary gap: Figma needs hardening and curation across V1/V2/V3 before code implementation, especially choosing which landing variant becomes canonical.
- The next productive work is to create a Figma/code mapping table: Figma component/token -> CSS variable/component/API -> current implementation gap.

### Run 2: Core Art Direction and Token System

- Recommended Agent: designer
- Steps / Files / Tests

Create or refine Figma foundations for the core EweserDB system.

Define:

- Color tokens: ink, paper, red, muted surface, border, inverse, warning, success, disabled
- Type styles: manifesto display, section heading, mono label, UI label, body, caption, code
- Spacing scale: compact industrial rhythm that supports both dense UI and landing sections
- Stroke, shadow, border, and radius rules
- Layout rules for rails, status bars, system panels, diagrams, and page bands

Acceptance criteria:

- Tokens and styles are named and reusable
- The system can support both landing-page drama and quieter product screens
- No major style choice exists only as an untracked one-off frame property

### Run 3: Component Primitives

- Recommended Agent: designer / coder
- Steps / Files / Tests

Build the smallest useful component kit in Figma before composing full pages.

Core components:

- Header / nav
- Button variants
- Status badge / label
- System panel
- Feature card
- Diagram node
- Connector / rail treatment
- Terminal or code block
- Product preview card
- Permission / access card
- Data collection row
- Footer

Acceptance criteria:

- Components have variants where needed
- Component spacing and typography are internally consistent
- Components can be used on both light paper and dark industrial backgrounds
- Components do not depend on screenshot-specific positioning to look good

### Run 4: Landing Page Recomposition in Figma

- Recommended Agent: designer
- Steps / Files / Tests

Rebuild the core landing page from the component system.

Use the story structure from `2026-04-27-landing-page-story-pass.md`:

- Hero: "Your data. Not their moat."
- Problem: apps became landlords
- Model shift: own the substrate, swap the interface
- Use cases: AI/MCP, notes, knowledge base, study tools, publishing, team memory
- Product previews: auth, personal data, connected apps, MCP access
- Developer proof: local-first SDK, schemas, sync, MCP-ready access
- Final manifesto / CTA

Acceptance criteria:

- The first viewport has a strong brand signal and a real product/system visual
- The page feels related to the Stitch direction but more coherent
- Repeated modules visibly come from the component system
- The page does not center Ewe Note as the whole product

### Run 5: Core Product Surface Patterns

- Recommended Agent: designer
- Steps / Files / Tests

Use the same design system to define the first authenticated core surfaces.

Priority screens:

- Personal Data Home
- Connected Apps and Permissions
- MCP / AI Access
- Auth / account trust entry

Acceptance criteria:

- Product screens feel calmer than the landing page but clearly share the same system
- Ownership, permissions, grants, schemas, sync, and app access are visible in the UI structure
- Ewe Note appears only as one connected app or proof point, not as the product center

### Run 6: Code Implementation Pass

- Recommended Agent: coder
- Steps / Files / Tests

After Figma is approved, implement the system in the codebase.

Likely areas to inspect before editing:

- Landing page app/package currently serving `eweser.com`
- Shared examples components if reused by core pages
- Auth pages if core auth UI is part of this pass
- Tailwind/theme tokens or CSS variables

Implementation rules:

- Preserve existing monorepo patterns
- Avoid introducing a second unrelated component system
- Prefer tokens and reusable primitives over one-off CSS
- Keep Ewe Note-specific components separate from core EweserDB components

Tests / checks:

- `npm run build`
- Targeted package checks for touched workspaces
- Browser screenshot checks at desktop and mobile widths
- Manual visual QA against the approved Figma frames

### Run 7: QA and Hardening

- Recommended Agent: qa
- Steps / Files / Tests

Review the Figma and code outputs for coherence, usability, and implementation quality.

Check:

- Text does not clip or overlap
- Mobile hierarchy remains intentional
- Components share tokens and styles
- Landing and authenticated surfaces feel related
- The page is distinctive without sacrificing clarity
- The code does not regress package APIs or require changesets unless published packages changed

Acceptance criteria:

- Approved screenshots exist for desktop and mobile
- The design system produces at least one strong landing page and two credible product surfaces
- Remaining issues are tracked as explicit follow-up tasks, not vague dissatisfaction

## Execution Summary

| Run | Workstream               | Can Parallelize? | Depends On        | Output                               |
| --- | ------------------------ | ---------------- | ----------------- | ------------------------------------ |
| 1   | Audit and gap diagnosis  | Yes              | None              | Gap list, reusable pattern inventory |
| 2   | Tokens and art direction | Partially        | Run 1             | Core Figma foundations               |
| 3   | Component primitives     | Partially        | Run 2             | Reusable Figma component kit         |
| 4   | Landing recomposition    | No               | Run 3             | Approved landing page frames         |
| 5   | Core product surfaces    | Yes, after Run 3 | Run 3             | Product UI pattern frames            |
| 6   | Code implementation      | No               | Runs 4-5 approval | Implemented landing/core components  |
| 7   | QA and hardening         | Partially        | Run 6             | Visual and build verification        |

Recommended sequencing:

1. Run 1 first to stop guessing.
2. Run 2 and Run 3 as the design-system foundation.
3. Run 4 and Run 5 as separate composition tracks once components exist.
4. Run 6 only after Figma is visually approved.
5. Run 7 before PR.

## Tooling Strategy

Use Stitch for:

- Fast mood and composition exploration
- Alternate hero directions
- Visual references for industrial/punk treatments
- Testing whether a section has enough energy

Do not use Stitch for:

- Final source-of-truth components
- Token naming
- Variant logic
- Production layout specifications

Use Figma for:

- Source-of-truth design system
- Reusable components
- Page composition
- Landing/product visual approval
- Handoff frames for implementation

Use Codex for:

- Auditing Figma and code against each other
- Creating or repairing Figma structure
- Turning approved frames into reusable code
- Running build and screenshot verification
- Keeping plans and implementation scoped

## Definition of Done

This effort is done when:

- Figma has a coherent EweserDB core design system page
- The landing page is recomposed from reusable components and approved visually
- At least two core product surfaces share the same system
- The implemented landing page matches the approved direction at desktop and mobile sizes
- The system clearly separates EweserDB core from Ewe Note
- The result feels distinctive, useful, and product-grade rather than merely themed

## Risks

- Overcorrecting into poster design that does not work for product UI
- Keeping the design too restrained and losing the Stitch energy
- Treating red/black/cream as the whole brand instead of building real interaction components
- Implementing code before Figma has a stable component grammar
- Letting Ewe Note-specific needs define the core product system

## Open Questions

- Should the core landing page use a mostly light paper background with dark/red industrial sections, or a darker industrial shell with light product panels?
- Which Stitch frame should become the primary hero reference?
- Should the core Figma system live in the existing design-system file or a new cleaner file/page?
- Which code package owns the first implementation of core EweserDB components?
- Are auth pages part of the first implementation pass, or should they follow after landing and personal data surfaces?
