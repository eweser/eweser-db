# Plan: eweser.com Landing Page

> **Status:** Draft — awaiting user approval

## Goal

Build a compelling static landing page for eweser.com that converts both PKM/productivity users and developers, built in Figma Make then integrated as a standalone package served at the root domain.

---

## Context

- **Current state:** `eweser.com/` falls through to the ewe-note SPA (`/srv/app` in Caddyfile). There is no landing page.
- **ewe-note** is already on its own subdomain: `notes.eweser.com`
- **`/auth/*`** serves the auth React SPA (login, signup, permissions)
- **`/api/*`** routes to auth-api (Hono)
- The root Caddy `handle` block just needs to point at a new `/srv/landing` static dir

---

## Recommended Approach: Figma Make → Vite static build

Yes — Figma Make is the right call. Last time it produced a polished result quickly. Use it again with this content brief, then paste the generated code into a `packages/landing/` Vite project.

---

## Scope

**In:**

- New `packages/landing/` package (Vite, static HTML/CSS/JS — no heavy framework needed but React is fine if Figma Make outputs it)
- Caddyfile tweak: root `handle` points at `/srv/landing` instead of `/srv/app`
- Docker Compose: add a `landing` service or fold static files into Caddy container
- Content copywriting (see brief below)

**Out:**

- Any changes to packages/db, packages/auth-server-hono, or published APIs
- CMS or dynamic content
- Blog / docs section (separate concern)
- Any changeset required (landing package is not a published npm package)

---

## Landing Page Content Brief (for Figma Make prompt)

Use this as the basis for your Figma Make prompt. Tailored to two audiences stacked in one scroll: first the PKM user, then the developer.

### Page Structure

```
[ 1. Hero ]
[ 2. The Problem / Philosophy ]
[ 3. Features for Users (PKM/productivity) ]
[ 4. Demo / Animated GIF — interop in action ]
[ 5. Features for Developers ]
[ 6. Architecture / Tech callouts ]
[ 7. Self-hosting CTAs ]
[ 8. Footer ]
```

---

### Section 1 — Hero

**Headline:**

> Your notes. Your data. Every app.

**Subheadline:**

> EweserDB is a local-first, user-owned database. Write in one app, read in another. Take your PKM anywhere — no lock-in, no vendor dependency, works offline.

**CTA buttons:**

- Primary: `Try Ewe Note →` (links to notes.eweser.com)
- Secondary: `For Developers` (anchor scroll to dev section)

**Visual:** Animated loop showing the same note open side-by-side in two different "apps" (could be abstract colored panels), both updating in real time.

---

### Section 2 — Philosophy / The Problem

Two-column contrast layout:

| **Old world**                          | **EweserDB world**                                       |
| -------------------------------------- | -------------------------------------------------------- |
| You ask Notion: "Can I have my notes?" | Notion asks you: "Can I see your notes?"                 |
| Switching apps means starting over     | All your data follows you to any app                     |
| Offline? Hope the app cached it        | Offline first — always available                         |
| Your AI assistant can't touch your PKM | AI agents access your data via MCP — you stay in control |

**Tagline:** _"It's like decentralized Firebase — but users own the data, not the platform."_

---

### Section 3 — Features for PKM / Productivity Users

Icon + headline + 2-line description cards (3-column grid):

1. **Works Offline, Always**  
   Your data lives in your browser first. Notes sync when you're back online — automatically, silently.

2. **Use Multiple Apps, Share One Dataset**  
   Take notes in Ewe Note. Review flashcards in a flashcard app. Both apps work with the same exact data — no copy-paste, no export, no sync setup.

3. **Real-Time Collaboration**  
   Share a room with a teammate. Edit together live. Conflict-free merging — no one's work gets lost.

4. **Skip the Onboarding**  
   Try a new PKM app with all your existing data already loaded. No onboarding friction — just switch and go.

5. **Self-Host or Use Our Server**  
   One-click deploy on Railway (~$5/mo). Or run it on your own VPS. You own the server, you own the data.

6. **AI-Powered — On Your Terms**  
   Give Claude, Copilot, or any MCP-compatible AI agent access to your notes. You control what the agent can see and write. No third-party data broker.

---

### Section 4 — Demo Panel

Animated screen recording or SVG:

- Left: "Ewe Note" with a note being typed
- Right: A "Flashcard App" showing the same note being referenced
- Both updating in real-time
- Offline badge appearing, then syncing back
- Small caption: _"One user. Two apps. Same Yjs CRDT document."_

---

### Section 5 — Developer Section (clearly separated, maybe dark-themed)

**Headline:** _Build interoperable apps in minutes_

**Subheadline:**

> Add `@eweser/db` to your app. Users bring their own data. No backend required.

**Code block:**

```bash
npm install @eweser/db yjs
```

```tsx
import { Database } from '@eweser/db';

const db = new Database({
  initialRooms: [{ collectionKey: 'notes', name: 'My Notes' }],
});
const room = db.getRoom('notes');
const Notes = room.getDocuments();

Notes.new({ text: 'Hello from any app' });
// ↑ syncs to all other apps the user has authorized
```

**3-column dev features:**

1. **TypeScript-native**  
   Strongly-typed document schemas. Notes, flashcards, profiles — with `_ref` cross-links between collections.

2. **Yjs CRDT under the hood**  
   Conflict-free, offline-tolerant data sync. IndexedDB for local persistence. Hocuspocus WebSocket for real-time.

3. **MCP server built-in**  
   Ship an AI-native app instantly. Your users' AI agents (Claude Desktop, VS Code Copilot) connect via `@eweser/mcp` — zero extra backend code.

4. **No backend required**  
   Point your app at `eweser.com` or any self-hosted homeserver. Auth, sync, and access control all handled.

5. **Build on shared schemas**  
   Use existing collection types to interoperate with other EweserDB apps. Or extend privately with your own schemas.

6. **Open source, MIT**  
   Full monorepo on GitHub. Self-host the whole stack. No dependency on our servers.

---

### Section 6 — Philosophy Deep Dive (for devs / power users)

Short flowing paragraph or pull-quote style:

> _"The current paradigm: you ask the app for your data. The new paradigm: the app asks you for your data."_

> EweserDB enforces this at the protocol level. Auth servers are federated — a user on one homeserver can share rooms with a user on another. Access control is per-room, per-user, with expiring JWT grants. Apps never hold the data. Users do.

> This means apps must compete on experience, not lock-in. Third parties can build new features on your notes without needing permission from the original app developer. The ecosystem compounds.

---

### Section 7 — Self-Hosting & Get Started

Two CTA cards side by side:

**Card 1: Users**

> **Try Ewe Note free**  
> No sign-up friction. Works on our hosted server.  
> [Open Ewe Note →]

**Card 2: Developers**

> **Deploy your own homeserver**  
> Railway one-click or VPS script.  
> [One-click Railway deploy ↗] [GitHub repo ↗]

---

### Section 8 — Footer

- Links: GitHub, npm package, docs, auth server
- Stack callouts: Yjs · Hocuspocus · better-auth · TypeScript · MIT
- Tagline: _EweserDB — 'Ewe-ser', pronounced 'user'. Because you are._

---

## Technical Plan

### Run 1: Create `packages/landing/` scaffolding (Astro)

- **Recommended Agent:** `02-coder` (Fast — boilerplate)
- [ ] Create `packages/landing/` as an **Astro** project (static output, full prerendered HTML for SEO)
- [ ] Add `@astrojs/react` integration so Figma Make React components drop straight in as islands
- [ ] `package.json` with `build` script → `astro build` outputs to `dist/`
- [ ] `.astro` page shells for each section, ready for Figma Make content
- [ ] Dockerfile: `FROM node:20-alpine AS build + FROM nginx:alpine` (or Caddy) serving `dist/`
- [ ] Files: `packages/landing/package.json`, `packages/landing/astro.config.mjs`, `packages/landing/Dockerfile`, `packages/landing/src/pages/index.astro`

### Run 2: Paste & wire Figma Make output

- **Recommended Agent:** human / `02-coder` (Fast)
- [ ] Paste Figma Make generated HTML/CSS/JS into `packages/landing/src/`
- [ ] Adjust anchor links (`#developer`, CTA buttons pointing to `notes.eweser.com`, GitHub, Railway)
- [ ] Add Railway deploy badge SVG + GitHub repo links
- [ ] Ensure responsive (Figma Make usually handles this)

### Run 3: Docker/Caddy integration

- **Recommended Agent:** `02-coder` (Fast)
- [ ] Add `landing` service to `docker-compose.yml` and `docker-compose.prod.yml`
- [ ] Update Caddyfile root `handle` block:
  ```
  handle {
      root * /srv/landing
      file_server
  }
  ```
  (No `try_files` needed for a pure static site — or add it if React Router is used)
- [ ] Remove or repurpose the old root → ewe-note redirect (ewe-note stays on `notes.` subdomain only)
- [ ] Files: `docker/Caddyfile`, `docker-compose.yml`, `docker-compose.prod.yml`

---

## Risks

- **Figma Make output quality** — May need CSS cleanup or responsiveness fixes. Account for 1–2 hours of polish.
- **Current `/` usage** — Double-check: is the Caddy root `handle` currently needed for any redirect logic (there's already a `@legacy_login` matcher at `/` with query params). The legacy redirect must be preserved.
- **No changeset needed** — `packages/landing` is not a published package. Confirm it's excluded from changesets config.
- **SEO** — Astro prerenders full HTML at build time; crawlers see complete content with no JS required. Each `.astro` page is a static HTML file.

---

## Execution Summary

```text
Run 1: Scaffold packages/landing/ (Fast) — can be done before Figma Make
    ↓ [human step: paste Figma Make output]
Run 2: Wire Figma Make output + links (Fast)
    └── Run 3: Docker + Caddy integration (Fast) [can run concurrently with Run 2]
```

Total coding time estimate: ~1–2 hours coder + Figma Make design session.

---

## Status

- [ ] Approved by user
