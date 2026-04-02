# Phase 2: Frontend Migration

> **Plan:** [Big Refactor Index](./2026-04-02-big-refactor.md)
> **Prerequisite:** Phase 1 complete (Hono auth API running, SDK updated)
> **Goal:** Extract auth UI into a React SPA. Port ewe-note (with PWA). Update example-basic. All behind Caddy.

Hard-cutover assumption: implement only the new architecture and route contracts, with no legacy compatibility UI flows.

## Progress

- [ ] Run 2.1 — Create auth-pages React SPA
- [ ] Run 2.2 — Add Caddy reverse proxy to Docker Compose
- [ ] Run 2.3 — Port Ewe Note to SPA + PWA
- [ ] Run 2.4 — Update example-basic for Docker Compose

## Agent Scratchpad

> Use this section to track decisions, blockers, and notes during implementation.

---

## Run 2.1: Create auth-pages React SPA

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Initializing a new React SPA with complex auth client integration.

**What:** Extract the login/signup/account UI from the Next.js auth-server into a standalone Vite React SPA.

**Current pages to extract:**

- Login page (`/auth/sign-in`)
- Signup page (`/auth/sign-up`)
- Email confirmation page
- Permission grant page (app requesting access)
- Invite acceptance page
- Account/home page
- Sign out action
- Terms of service, privacy policy

**Files:**

- Create `packages/auth-pages/` (new Vite React package)
  - `package.json` — react, react-dom, react-router, tailwind, radix-ui, @better-auth/client
  - `vite.config.ts` — SPA with `base: '/auth/'`
  - `index.html`
  - `src/App.tsx` — React Router routes
  - `src/pages/` — port each page component
  - `src/lib/auth-client.ts` — better-auth client SDK
  - `Dockerfile` — multi-stage: build with Node, serve with Caddy/nginx

**Key change:** Replace Supabase auth client calls with better-auth client SDK:

```typescript
import { createAuthClient } from 'better-auth/client';
const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_API_URL,
});
```

**Port UI components:**

- Copy existing Radix UI components from auth-server
- Copy Tailwind config
- Replace `next/navigation` with `react-router`
- Replace `next/link` with `<Link>` from react-router

**Tests:** Login flow renders → form submission → API call → redirect. Visual check that styling matches.

**Done when:** All auth pages work as a standalone SPA, talk to Hono auth API.

---

## Run 2.2: Add Caddy reverse proxy to Docker Compose

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Caddyfile configuration and Docker networking require high precision.

**What:** Add a Caddy service that routes traffic to auth-api, Hocuspocus, and serves SPAs.

**Files:**

- Create `docker/Caddyfile`
- Update `docker-compose.yml` with Caddy service + SPA build outputs

**Caddyfile:**

```
{$DOMAIN:localhost} {
    handle /api/auth/* {
        reverse_proxy auth-api:3000
    }
    handle /api/* {
        reverse_proxy auth-api:3000
    }
    handle /sync/* {
        reverse_proxy sync-server:8080
    }
    handle /auth/* {
        root * /srv/auth-pages
        try_files {path} /auth/index.html
        file_server
    }
    handle /notes/* {
        root * /srv/ewe-note
        try_files {path} /notes/index.html
        file_server
    }
    handle /* {
        root * /srv/app
        try_files {path} /index.html
        file_server
    }
}
```

**Tests:** Full stack via `docker compose up` → Caddy routes to all services → SPAs load → API calls work.

**Done when:** Single `docker compose up` starts everything behind Caddy.

---

## Run 2.3: Port Ewe Note to SPA + PWA

**Recommended Agent:** `02-coder` (Fast)
**Reason:** Porting existing React components and adding PWA boilerplate.

**What:** Move `packages/ewe-note/` to the new SPA architecture. Add PWA support (manifest, service worker) specifically for Ewe Note to ensure it works well as a standalone installable app.

**Files:**

- `packages/ewe-note/vite.config.ts` — add `vite-plugin-pwa`
- `packages/ewe-note/public/manifest.webmanifest` — app icons, theme colors, display mode
- `packages/ewe-note/src/pwa.ts` — service worker registration and update logic
- `packages/ewe-note/src/index.tsx` — update to use new SDK auth flow

**PWA Requirements:**

- Offline support for the shell (assets)
- Installable on mobile/desktop
- Custom splash screen and icons
- Background sync (handled by Yjs + IndexedDB, but SW ensures asset availability)

**Tests:**

- Lighthouse PWA audit passes
- App is installable from browser
- App loads while offline (using cached assets)

**Done when:** Ewe Note loads at `/notes/`, authenticates via auth-pages, syncs docs via Hocuspocus, and is fully installable as a PWA.

**Risks:** Service worker caching issues. Mitigate by using "Prompt for update" strategy in `vite-plugin-pwa`.

---

## Run 2.4: Update example-basic for Docker Compose

**What:** Update the basic example app to work in the Docker Compose stack.

**Files:**

- `examples/example-basic/vite.config.ts` — set `base: '/'`
- `examples/example-basic/src/` — update auth server URL references
- `examples/example-basic/Dockerfile` — multi-stage build

**Done when:** Example app works at root path, full auth + sync flow.

## Execution Summary

```text
Run 2.1: Create auth-pages SPA (Smart)
└── Run 2.2: Add Caddy proxy (Smart) [Parallel with 2.1]
    ├── Run 2.3: Port Ewe Note (Fast)
    └── Run 2.4: Update example-basic (Fast) [Parallel with 2.3]
```

## Status

- [ ] Approved by user
