# 2026-04-28 — App Shell Migration

## Goal

Expand `packages/app` from an auth-only React SPA into the full authenticated app shell at `app.eweser.com`. The Astro landing site stays at `eweser.com` for SSG/SEO. Both sites share design tokens via a small shared package.

This unblocks all planned pages in `2026-04-27-full-text-page-copy.md`: Personal Data Home, Connected Apps, and MCP/AI Access.

## Decision

**Option A** — expand `packages/app` into the app shell, keep Astro for marketing.

Rationale:

- better-auth session cookies are already bound to the auth origin; Personal Data Home, Connected Apps, and MCP management are all auth-gated and naturally belong here.
- Astro stays fast and statically renderable for SEO-critical pages.
- Style drift between the two sites is solved by a shared design tokens package, not by merging them.

## Scope

### In

- Rename deployment target from `login.eweser.com` → `app.eweser.com`.
- Add routes for Personal Data Home (`/`), Connected Apps (`/apps`), MCP/AI Access (`/ai`), Account Security (`/security`) to `packages/app`.
- Create `packages/design-tokens` (or `packages/ui`) with shared Tailwind preset + CSS custom properties consumed by both `packages/app` and `packages/landing`.
- Update better-auth cookie config to `Domain=.eweser.com` so the session cookie is readable at `app.eweser.com`.
- Update landing CTAs and nav links to point to `app.eweser.com/sign-in`, `app.eweser.com/sign-up`.
- Define and implement the redirect chain: landing CTA → `app.eweser.com/sign-in?redirect=/` → post-login → Personal Data Home.
- Add `eweser.com/connected-tools` as a static Astro page.

### Out

- Full UI implementation of Personal Data Home, Connected Apps, MCP/AI Access (those are separate implementation runs — this plan only sets up routing and shell).
- Moving or renaming the `packages/app` directory.
- Any changes to `packages/ewe-note` or `packages/auth-server-hono` beyond cookie domain config.
- Mobile / React Native.

## Runs

### Run 1: Shared Design Tokens Package

**Recommended Agent:** coder (fast)

Goal: Create `packages/design-tokens` with a Tailwind preset and CSS custom properties. Both `packages/landing` (Astro) and `packages/app` (Vite/React) consume it.

Steps:

- Create `packages/design-tokens/package.json`, `src/tailwind-preset.ts`, `src/tokens.css`.
- Extract colour palette, font scale, and spacing from the current `packages/app` Tailwind config into the preset.
- Update `packages/app` and `packages/landing` to extend the shared preset.
- Verify both sites still build: `npm run build` from root.

Files:

- `packages/design-tokens/` (new)
- `packages/app/tailwind.config.ts`
- `packages/landing/tailwind.config.*`
- Root `package.json` (add workspace entry)

Tests:

- `npm run build` in both packages passes without Tailwind errors.

---

### Run 2: Cookie Domain and Auth Config

**Recommended Agent:** coder (fast)

Goal: Set `Domain=.eweser.com` on the better-auth session cookie so it works at `app.eweser.com` and `note.eweser.com`.

Steps:

- Update `packages/auth-server-hono` better-auth config: set `cookieOptions.domain` to `.eweser.com` (behind an env var `COOKIE_DOMAIN` so local dev is unaffected).
- Update `.env.example` with `COOKIE_DOMAIN=.eweser.com`.
- Verify local dev still works with `COOKIE_DOMAIN` unset (falls back to same-origin default).

Files:

- `packages/auth-server-hono/src/auth.ts` (or wherever better-auth is configured)
- `packages/auth-server-hono/.env.example`

Tests:

- Existing auth server unit tests pass.
- Manual: sign in at `app.eweser.com` (or localhost equivalent), confirm cookie domain in browser devtools.

---

### Run 3: App Shell Routes in packages/app

**Recommended Agent:** coder (strong)

Goal: Add route shells for Personal Data Home (`/`), Connected Apps (`/apps`), MCP/AI Access (`/ai`), and Account Security (`/security`) inside `packages/app`. These are placeholder pages — full UI is implemented in later runs per the copy plan.

Steps:

- Add React Router (or whatever router is in use) routes for `/`, `/apps`, `/ai`, `/security`.
- Each route renders a minimal authenticated shell: header with nav, page title, "coming soon" body, and a link back to Account Home.
- Redirect unauthenticated users to `/sign-in?redirect=<current-path>`.
- Post-login redirect: if `redirect` query param is present, send there; otherwise send to `/`.
- Update the existing Account Home page to link to the new routes.

Files:

- `packages/app/src/router.tsx` (or equivalent)
- `packages/app/src/pages/Home.tsx` (new)
- `packages/app/src/pages/Apps.tsx` (new)
- `packages/app/src/pages/AIAccess.tsx` (new)
- `packages/app/src/pages/Security.tsx` (already exists — just wire the route)
- `packages/app/src/pages/SignIn.tsx` — add redirect-after-login logic

Tests:

- Navigate to `/` unauthenticated → redirects to `/sign-in?redirect=/`.
- Sign in → lands on `/`.
- Nav links for `/apps`, `/ai`, `/security` render without crashing.

---

### Run 4: Landing Page Links and Connected Tools Page

**Recommended Agent:** coder (fast)

Goal: Point landing CTAs to `app.eweser.com` and add a static `/connected-tools` Astro page.

Steps:

- Update landing hero CTAs: "Connect my AI" → `app.eweser.com/ai` (signed-out: `/sign-in?redirect=/ai`), "Try Ewe Note" → `note.eweser.com`.
- Update nav "Sign in" → `app.eweser.com/sign-in`.
- Add `packages/landing/src/pages/connected-tools.astro` — static page with the copy from the plan (signed-out preview, tool cards, no live connection actions).
- Update nav "Connected Tools" link from `#apps-mcp` anchor to `/connected-tools`.

Files:

- `packages/landing/src/pages/connected-tools.astro` (new)
- `packages/landing/src/components/Header.astro` (or equivalent)
- `packages/landing/src/pages/index.astro` (hero CTAs)

Tests:

- `npm run build` in `packages/landing` passes.
- `/connected-tools` renders all tool cards without JS errors.

---

## Execution Summary

| Run | Title                           | Agent        | Parallelizable             |
| --- | ------------------------------- | ------------ | -------------------------- |
| 1   | Shared Design Tokens            | coder/fast   | No — others depend on this |
| 2   | Cookie Domain Config            | coder/fast   | Yes (parallel with Run 1)  |
| 3   | App Shell Routes                | coder/strong | After Run 1                |
| 4   | Landing Links + Connected Tools | coder/fast   | After Run 1                |

Runs 2 and 1 can be parallelised. Runs 3 and 4 depend on Run 1 completing but can be parallelised with each other.

### 2026-04-29 Implementation Note

- Implemented the repo-side launch path for Runs 2, 3, and 4: `COOKIE_DOMAIN` env support, root Personal Data Home route, `/apps`, `/ai`, `/security` route aliases, landing links to `app.eweser.com`, and the static `/connected-tools` page.
- Updated app deployment config to build and serve `packages/app` at the root app route instead of the deleted `packages/auth-pages` `/auth` path.
- Verified with `npm test --workspace @eweser/app`, `npm test --workspace @eweser/auth-server-hono`, `npm run build --workspace @eweser/app`, `npm run build --workspace @eweser/landing`, and `npm run type-check --workspace @eweser/auth-server-hono`.
