# EweserDB App — Brand Style Spec

> Reference for all coding agents implementing UI in `packages/app`. Read this before writing any CSS, Tailwind class, or component.

## Design Goal

The app should feel like a **control panel built by people who have opinions**. Not a propaganda poster (that's the landing page). Not generic dark SaaS. The authenticated surfaces should be calm, legible, and competent — with the brand's defiant edge carried through typography, section labels, and a single accent color used precisely.

The brand has two modes:

- **Landing page** (editorial, high drama): full Soviet/revolutionary energy — big red, heavy condensed type, stark contrast
- **App** (operational, disciplined): the same brand at product volume — sharper than generic SaaS, but not a distraction

## Token Changes from Current

File to edit: `packages/app/src/index.css`

### What changes

| Token                  | Current value             | New value         | Reason                                                |
| ---------------------- | ------------------------- | ----------------- | ----------------------------------------------------- |
| `--primary` (dark)     | `hsl(224 40% 47%)` — blue | `hsl(0 70% 48%)`  | Brand red                                             |
| `--primary` (light)    | same blue                 | `hsl(0 65% 42%)`  | Darker red for light bg legibility                    |
| `--primary-foreground` | near-white                | `hsl(0 0% 100%)`  | Pure white on red                                     |
| `--radius`             | `0.75rem`                 | `0.25rem`         | Sharper panels, industrial not bubbly                 |
| `--card` (dark)        | same as background        | `hsl(222 60% 7%)` | Slight lift from page bg — cards readable as surfaces |
| `--ring`               | blue-gray                 | `hsl(0 70% 48%)`  | Focus ring matches primary red                        |

### What stays the same

Background, foreground, border, muted, muted-foreground, destructive, secondary — keep current values. The existing dark navy background is good. Only primary and radius change meaningfully.

### Add: custom brand tokens (append to `:root`)

```css
--brand-red: hsl(0 70% 48%);
--brand-red-muted: hsl(0 40% 20%); /* for tinted surfaces, not text */
--display-font: 'Barlow Condensed', 'Impact', sans-serif;
```

### Add: Google Font import

Add to top of `index.css`, alongside Inter:

```css
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700&family=Inter:wght@400;500;600;700&display=swap');
```

---

## Typography Rules

Two fonts. Strict separation. Do not mix.

### Display font — Barlow Condensed 700

Used for: page titles (`h1`), section headings (`h2`), and the nav logo wordmark only.

```css
/* Add to index.css */
h1,
h2 {
  font-family: var(--display-font);
  font-weight: 700;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}
```

Tailwind equivalent: `font-[family-name:var(--display-font)] font-bold uppercase tracking-tight`

### Body font — Inter

Used for: everything else. Nav links, body text, labels, form fields, card descriptions, table rows.

Do not put Barlow on form labels, nav links, button text, table cells, or any text smaller than 20px.

---

## Surface Patterns

Three reusable surface patterns. Use them consistently across all authenticated pages.

### 1. Section label — "industrial eyebrow"

Used above every major section heading. Communicates control-panel hierarchy without manifesto energy.

```tsx
<p className="section-label">01 // DATA HOME</p>
```

```css
/* Add to index.css */
.section-label {
  font-family: 'Inter', sans-serif;
  font-size: 0.6875rem; /* 11px */
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted-foreground);
  border-left: 2px solid var(--brand-red);
  padding-left: 0.5rem;
  margin-bottom: 0.75rem;
}
```

Use `section-label` before every `h1` or `h2` on a page. The red left border is the only brand-red element in the operational area of a page. Don't add more red here.

### 2. Status indicator strip — "active card"

Used on cards that represent a live connection, active grant, or current session. A 1px red top border signals "this thing is connected/live."

```tsx
<div className="card-active">...</div>
```

```css
.card-active {
  border-top: 2px solid var(--brand-red);
}
```

Use sparingly — only on items that are in an "active" or "connected" state. Connected apps, active agent grants, current session. Not on every card.

### 3. Control row — horizontal label + value pairs

Used inside cards and panels for displaying data (sync status, room count, last seen, etc). Creates the control-panel feel.

```tsx
<div className="control-row">
  <span className="control-label">Rooms</span>
  <span className="control-value">4</span>
</div>
```

```css
.control-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.control-row:last-child {
  border-bottom: none;
}

.control-label {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted-foreground);
}

.control-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--foreground);
}
```

---

## Component Overrides

### Button — primary

Primary buttons get the brand red from the token. No extra overrides needed after the `--primary` token update. Verify the button still reads at WCAG AA against both dark and light backgrounds after the token change.

Secondary/outline buttons stay as-is — dark background with border. Do not add red to outline buttons.

### Nav logo

The wordmark "EweserDB" should use Barlow Condensed 700, not Inter semibold. The logo mark (circle in circle) stays as-is.

```tsx
<span className="font-[family-name:var(--display-font)] text-xl font-bold uppercase tracking-tight text-foreground">
  EweserDB
</span>
```

### Card

With `--radius: 0.25rem` and the slight card lift (`--card: hsl(222 60% 7%)`), cards will immediately feel more like panels than bubbles. No additional override needed.

### Nav header

The sticky header background is `bg-background/80 backdrop-blur-xl`. Keep this — it creates the correct layering effect. The bottom border on the header is the only divider; don't add additional shadows.

---

## What NOT to do

- Do not put Barlow Condensed on anything below 20px or on form elements
- Do not use red as a background color anywhere in the authenticated app (only the landing page does this)
- Do not add additional box shadows to cards — the border + slight bg lift is enough
- Do not use `card-active` on more than 1–2 cards per page
- Do not add decorative elements (gradients, glows, floating blobs) to data-heavy pages like Data Home or Connected Apps
  - Auth layout pages (sign in, sign up) may keep the existing radial gradient background — it's appropriate for an entry screen
- Do not increase border radius — `0.25rem` is a deliberate decision. Resist Tailwind defaults like `rounded-lg` or `rounded-xl` except on avatars and logo marks

---

## Page-by-page application guide

### Nav / SiteHeader

- Logo: Barlow Condensed 700 uppercase "EWESERDB"
- Links: Inter 14px muted, standard
- No changes to current sticky/backdrop-blur behavior

### Auth pages (sign-in, sign-up, reset)

- Eyebrow: `section-label` class
- Headline: Barlow Condensed 700 uppercase (h1)
- Form panel: card with `--radius: 0.25rem` — will look correct after token change
- Primary button: red from token — no override needed
- Keep existing radial gradient bg on auth layout — appropriate for entry screens

### Account Home / Data Home

- Section eyebrow: `section-label` ("01 // DATA HOME")
- Four cards in 2×2 grid — standard cards, no `card-active` (nothing is "active" here, it's a menu)
- Card titles: Inter semibold — NOT Barlow (too small for display font)

### Connected Apps page

- Active connections get `card-active` (red top border)
- Status rows inside each card use `control-row` / `control-label` / `control-value`
- Section eyebrow: `section-label` ("02 // CONNECTED APPS")

### MCP / AI Access page

- Same pattern as Connected Apps
- Section eyebrow: `section-label` ("03 // MCP ACCESS")
- Agent token status row uses `control-row`
- Active/connected agents get `card-active`

### Account Security page

- Section eyebrow: `section-label` ("04 // SECURITY")
- Verification status rows use `control-row`
- No `card-active` — nothing is "connected"

---

## Contrast check requirements

Before shipping the token change, verify these pass WCAG AA (4.5:1 for normal text, 3:1 for large):

- `hsl(0 70% 48%)` red on `hsl(222 84% 5%)` dark background — primary button bg vs page bg (3:1 large text threshold)
- White `hsl(0 0% 100%)` on `hsl(0 70% 48%)` red — button label text (must pass AA)
- `hsl(0 65% 42%)` red on `hsl(0 0% 100%)` white — light mode primary button (must pass AA)

Use https://webaim.org/resources/contrastchecker/ to verify before committing.

---

## Files to change

| File                                 | Change                                      |
| ------------------------------------ | ------------------------------------------- |
| `packages/app/src/index.css`         | Token updates, font import, utility classes |
| `packages/app/src/pages.tsx`         | Logo wordmark font, section-label usage     |
| `packages/app/src/components/ui.tsx` | No changes needed — tokens handle it        |

## Files NOT to change

- `packages/ewe-note/` — separate app, separate design pass
- `packages/landing/` — different design system, keep as-is
- Any shared package CSS
