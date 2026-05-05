# Design

## Visual Theme

EweNote should feel closer to Bear than to a dashboard: dark desk, high contrast
writing surface, compact side panels, and nearly invisible controls until hover
or keyboard use.

## Color Palette

- Background: warm near-black OKLCH neutrals, never pure black.
- Text: high-contrast warm white for note body.
- Muted text: readable grey-brown for secondary note preview metadata.
- Accent: restrained blue only for selection, bullets, focus, and sync state.
- Borders: low-chroma separators that define panels without drawing attention.

## Typography

Use the native system UI stack. The editor body should be larger and clearer
than chrome. UI labels should be hidden from panels 1-3 wherever icons,
structure, or user note text can carry the meaning.

## Layout

Panel 1: folders/navigation, mostly icon-led.
Panel 2: recent or scoped note previews only.
Panel 3: sparse editor canvas with the note body as the only prominent text.
Panel 4: note metadata, links, outline, and properties with normal labels.

## Components

Use tiny circular icon controls, hover-revealed secondary actions, and `...`
menus for text-heavy actions. Avoid card-like chrome in the editor surface.

## Motion

Use short opacity and color transitions only. Do not animate layout for writing
surfaces.
