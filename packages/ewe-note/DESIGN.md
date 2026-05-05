---
name: EweNote
description: Calm local-first note workspace with Obsidian-class depth and Bear-level restraint.
colors:
  workspace-ink: 'oklch(0.145 0.01 95)'
  workspace-panel: 'oklch(0.16 0.01 95)'
  workspace-rail: 'oklch(0.17 0.01 95)'
  surface-hairline: 'oklch(1 0 0 / 0.06)'
  warm-paper: 'hsl(45 30% 94%)'
  warm-paper-raised: 'hsl(45 28% 97%)'
  warm-ink: 'hsl(30 20% 15%)'
  quiet-cocoa: 'hsl(30 25% 45%)'
  muted-parchment: 'hsl(42 25% 88%)'
  muted-walnut: 'hsl(30 15% 45%)'
typography:
  display:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    fontSize: '2.4rem'
    fontWeight: 650
    lineHeight: 1.12
    letterSpacing: '-0.035em'
  title:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.03em'
  body:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '0.18em'
rounded:
  sm: '0.25rem'
  md: '0.5rem'
  lg: '1rem'
  xl: '1.5rem'
  pill: '999px'
spacing:
  xs: '0.25rem'
  sm: '0.5rem'
  md: '1rem'
  lg: '1.5rem'
  xl: '2rem'
components:
  note-row:
    backgroundColor: 'transparent'
    textColor: '{colors.warm-paper}'
    rounded: '{rounded.xl}'
    padding: '0.75rem'
  note-row-selected:
    backgroundColor: 'oklch(1 0 0 / 0.10)'
    textColor: '{colors.warm-paper}'
    rounded: '{rounded.xl}'
    padding: '0.75rem'
  shell-button:
    backgroundColor: 'oklch(1 0 0 / 0.06)'
    textColor: '{colors.warm-paper}'
    rounded: '{rounded.pill}'
    padding: '0.5rem 0.75rem'
---

# Design System: EweNote

## 1. Overview

**Creative North Star: "A Quiet Writing Desk With Hidden Drawers"**

EweNote is a restrained product interface for sustained writing, capture, and personal knowledge work. The workspace should feel native and calm before it feels powerful; capability appears in adjacent panes, contextual controls, and keyboard shortcuts rather than in a loud persistent toolbar.

The system rejects dashboard composition, nested cards, decorative gradients, and metadata-forward layouts. Bear is the restraint reference: soft density, polished list rows, text-first hierarchy. Obsidian is the capability reference: folders, wiki links, tags, metadata, backlinks, and keyboard-driven workspace control.

**Key Characteristics:**

- Note body and title carry the visual hierarchy.
- Sidebar, note list, and metadata panel are supporting furniture, not the subject.
- Accent color is rare and stateful: selection, primary action, focus, or link affordance.
- Dark workspace mode is acceptable when it serves focused writing; light tokens remain supported and readable.

## 2. Colors

The palette is restrained: warm neutrals, paper/cocoa undertones, and low-chroma dark workspace surfaces.

### Primary

- **Quiet Cocoa** (`hsl(30 25% 45%)`): Primary actions and rare active accents. Do not use as decoration.

### Secondary

- **Muted Clay** (`hsl(28 40% 65%)`): Secondary warmth for supportive states, never for large inactive backgrounds.

### Neutral

- **Workspace Ink** (`oklch(0.145 0.01 95)`): Dark writing workspace background.
- **Workspace Panel** (`oklch(0.16 0.01 95)`): Raised dark panels, headers, and note-library surfaces.
- **Workspace Rail** (`oklch(0.17 0.01 95)`): Sidebar and navigation rail surface.
- **Surface Hairline** (`oklch(1 0 0 / 0.06)`): Dark-mode dividers and low-contrast borders.
- **Warm Paper** (`hsl(45 30% 94%)`): Light background and high-contrast dark-mode text target.
- **Warm Paper Raised** (`hsl(45 28% 97%)`): Light raised surfaces.
- **Warm Ink** (`hsl(30 20% 15%)`): Light-mode body text.
- **Muted Parchment** (`hsl(42 25% 88%)`): Light muted surface.
- **Muted Walnut** (`hsl(30 15% 45%)`): Light secondary text.

### Named Rules

**The Ten Percent Accent Rule.** Accent color should stay under roughly ten percent of a workspace view; selection can be visible without becoming decorative.

**The Tinted Neutral Rule.** Avoid pure black and pure white. Every neutral should carry a subtle warm tint so the app reads like a writing surface, not an IDE.

## 3. Typography

**Display Font:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
**Body Font:** `-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
**Label/Mono Font:** system mono only for keyboard shortcuts and code.

**Character:** Native, editorial, and quiet. The note title can be large and confident, but labels and panel text should stay compact and utility-like.

### Hierarchy

- **Display** (650, `2.4rem`, 1.12): Note title and major empty-state headline.
- **Headline** (650, `2rem`, 1.2): Rare route-level headings.
- **Title** (600, `1.25rem`, 1.25): Pane headings and list section titles.
- **Body** (400, `1rem`, 1.7): Note prose, capped around 65-75ch.
- **Label** (600, `0.6875rem`, uppercase tracking): Rail labels, section headers, and small mode labels.

### Named Rules

**The Prose First Rule.** If a type choice makes the chrome more noticeable than the editor body, it is wrong.

## 4. Elevation

EweNote uses tonal layering and hairline borders by default. Shadows are reserved for overlays and rare floating surfaces such as command palettes, popovers, and mobile metadata panels.

### Shadow Vocabulary

- **Overlay Shadow** (`0 24px 60px rgba(0,0,0,0.18)`): Command palettes, major floating panels, and temporary overlays.
- **None At Rest** (`none`): Sidebars, note rows, editor headers, metadata panels, and persistent workspace panes.

### Named Rules

**The Flat Workspace Rule.** Persistent panes should feel physically adjacent, not stacked as cards. Use borders, contrast, and spacing before shadows.

## 5. Components

### Buttons

- **Shape:** Round or pill for compact controls; use `0.5rem` only for dense menus and form controls.
- **Primary:** Low-chroma filled pill with restrained contrast, used for `New note` and equivalent primary actions.
- **Hover / Focus:** Slight tonal lift plus visible focus ring. Do not animate layout properties.
- **Ghost:** Transparent at rest with hover tint; default for chrome controls, pane toggles, and note actions.

### Chips

- **Style:** Small, rounded, muted background or hairline outline.
- **State:** Tags and metadata chips are informative, never headline content.

### Cards / Containers

- **Style:** Avoid dashboard-style cards as the primary library metaphor. Workspace panes are structural surfaces; note rows are list objects.
- **State:** Selected note row uses subtle filled background plus title contrast. Avoid colored side stripes.

### Inputs

- **Style:** Transparent or low-tint backgrounds with clear text hierarchy.
- **State:** Title input should feel like a document title, not a form field. Search can use a quiet pill affordance.

### Panels

- **Sidebar:** App identity, primary views, folders, account/settings. Dense but not busy.
- **Notes List:** Search, mode controls, selected list, note preview, date, folder/tag hint.
- **Metadata Panel:** Outline, links, and properties. Secondary, scannable, and dismissible via pane mode.

## 6. Do's and Don'ts

### Do

- Keep the editor body visually central and spacious.
- Use pane modes as a core mental model: write, browse, organize, inspect.
- Make empty states useful and brief.
- Preserve keyboard shortcuts and visible focus states.
- Prefer progressive disclosure over persistent controls.

### Don't

- Do not make home feel like a metrics dashboard.
- Do not let tags/properties dominate the editor header.
- Do not use decorative gradients, glassmorphism, or hero metrics.
- Do not create nested cards for note lists, sidebars, or metadata groups.
- Do not hide offline-first writing behind auth or network-dependent chrome.
