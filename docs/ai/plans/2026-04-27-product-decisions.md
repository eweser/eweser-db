# EweserDB: Product Decisions and Rationale

Source of actual page copy: `2026-04-27-full-text-page-copy.md`
Voice direction and headline pool: `2026-04-27-core-copy-deck.md`

---

## Goal

Define the ideal final-form page set for EweserDB before the redesign begins. This is a forward-looking plan, not a description of the current codebase state.

The redesign has two main jobs:

1. **Marketing site** (`eweser.com`) — fully public, no login required. The landing page plus a small set of explorable pages that let someone understand the product before committing to sign up.
2. **App shell** (`app.eweser.com`) — the authenticated data management and permission control surface. Calm, functional, utility-first. Not a marketing site. Not a notes app.

Ewe Note (`note.eweser.com`) is a separate app and stays that way. Its settings stay thin and delegate to the app shell for deep management.

## Status Legend

Used only where helpful to note design intent vs. aspirational detail.

- **In scope for redesign**: target for the next big version
- **Future-facing**: aspirational, do not design for now

## Page Architecture: Ideal Final Form

### Surface 1 — Marketing site (`eweser.com`)

Fully public. Astro. No auth required.

**Navigation:**

- **Manifesto** — `/manifesto`
- **Apps** — `/apps`; replaces "Connected Tools"
- **MCP** — `/mcp`; the AI/agent connection story
- **Developers** — `/developers`; SDK and build-with-it content
- **Sign in** (utility, not primary nav)

**Page set:**

| Page       | Route         | Purpose                                                               |
| ---------- | ------------- | --------------------------------------------------------------------- |
| Landing    | `/`           | Product story, how it works, dual-audience routing                    |
| Apps       | `/apps`       | Public directory of available apps and what each does                 |
| MCP        | `/mcp`        | AI/agent connection story, supported clients, how scoped access works |
| Manifesto  | `/manifesto`  | Longer-form data ownership argument                                   |
| Developers | `/developers` | SDK quickstart, schema overview, self-host path                       |

**Note on "connected tools" in two places:**
The concept exists at two levels — the public exploration side (what can I connect?) and the authenticated management side (what have I connected?). The public side is covered by the Apps and MCP pages above. The authenticated management side lives in the app shell at `/apps` and `/ai`. Different URLs on different domains — no naming conflict, but the design should make the relationship clear (e.g. a CTA on the public Apps page: "Manage your connected apps →" that links to `app.eweser.com/apps` after sign-in).

### Surface 2 — App shell (`app.eweser.com`)

React SPA. All management pages are protected (auth required). Auth/entry pages are public.

**Auth and entry pages (public):**

| Page                                 | Route                              |
| ------------------------------------ | ---------------------------------- |
| Sign in                              | `/sign-in`                         |
| Sign up                              | `/sign-up`                         |
| Two-factor challenge                 | `/two-factor`                      |
| Forgot password                      | `/forgot-password`                 |
| Reset password                       | `/reset-password`                  |
| Verify email                         | `/verify-email`                    |
| Await confirmation                   | `/await-confirm`                   |
| Sign out                             | `/sign-out`                        |
| Terms of service                     | `/statement/terms-of-service`      |
| Privacy                              | `/statement/privacy`               |
| App access grant (permission prompt) | `/access-grant/permission`         |
| Room invite accept                   | `/access-grant/accept-room-invite` |

The permission and room invite pages are technically protected by session but are entry-point flows — a user could arrive from an external app link. Treat their copy as boundary-crossing user-facing flows, not internal management pages.

**Management pages (authenticated, the actual redesign target):**

| Page            | Route          | One-line purpose                                                                  |
| --------------- | -------------- | --------------------------------------------------------------------------------- |
| Data home       | `/`            | Overview of everything: collections, rooms, connected apps, AI grants, sync state |
| Collections     | `/collections` | Browse and inspect collection schemas and room counts                             |
| Rooms           | `/rooms`       | List all rooms across collections, see sharing status, sync state                 |
| Connected apps  | `/apps`        | All apps with data access: scopes, last used, revoke                              |
| MCP / AI access | `/ai`          | AI client setup, token/OAuth management, access review                            |
| Account         | `/account`     | Profile, email, identity settings                                                 |
| Security        | `/security`    | Password, 2FA, sessions                                                           |

The data home (`/`) is the control plane landing. It shows summary panels for each major area and links to the detail pages. It is not a nav card menu — it shows live data.

### Surface 3 — Ewe Note (`note.eweser.com`)

Separate app, separate domain. Not part of the app shell redesign.

| Page       | Route             |
| ---------- | ----------------- |
| Notes home | `/`               |
| Editor     | `/editor/:noteId` |
| Settings   | `/settings`       |

Ewe Note settings stays thin: auth state, sync toggle, link out to `app.eweser.com` for permissions and data management.

## Feature Reality: What Needs to Be Designed

The following is what needs to exist in the redesigned app shell management pages. This is not a current-state inventory — it is the design target.

### Data Home (`/`)

The first page a signed-in user sees. Shows the state of their data layer at a glance. Every section is a live summary, not a nav menu.

Sections:

**Quick stats bar**

- Collections: count
- Rooms: count
- Connected apps: count
- AI grants: count
- Local storage: size or "Calculating"
- Last synced: timestamp or "Never"

**Collections summary**
Each collection as a row: name, description, room count, last updated.
Known collections: `notes`, `flashcards`, `profiles`, `agentConfigs`, `agentAccessLogs`, `conversations`.
Link to full collections page.

**Rooms summary**
First N rooms as a table: room name, collection, sharing status, last synced.
Empty state: no rooms yet — they are created when an app connects.
Link to full rooms page.

**Sync status**
Homeserver URL (or "Not connected"), sync status (Connected / Offline / Syncing), last synced timestamp.

**Connected apps (summary)**
Apps with active grants: name, domain, scopes, last access, revoke action.
Empty state: no apps connected yet.
Link to full connected apps page.

**AI / MCP access (summary)**
Active AI clients: client name, auth type, status, last used, revoke action.
Empty state: no AI clients connected.
Links: manage AI access, connect a new client.

### Collections (`/collections`)

Browse all collection schemas. Each collection shows:

- Name and description
- Schema summary (what fields a document has)
- Room count
- Which apps currently have access
- Link to rooms in this collection

Purpose: let users understand what kinds of data each collection holds and who can see it.

### Rooms (`/rooms`)

All rooms across all collections. Table view:

Columns: room name, collection, sharing (private / shared / public), last synced, connected apps count, actions.

Row actions: view documents, manage sharing, revoke all access, delete room.

Empty state: rooms are created when apps connect — try Ewe Note or connect an AI client to create your first room.

Sharing detail (per room):

- Who has access: list of apps and people
- Invite someone: send a room invite by email
- Revoke individual access

### Connected Apps (`/apps`)

Every app that has been granted access to rooms or collections.

**Main table:**
Columns: app name, domain, collections, scopes (read / read-write), rooms granted, last access, status, revoke.

**Pending requests:**
Apps waiting for approval. Show requested collections, requested scopes, domain, and approve/deny actions.

**Scope detail (expandable per app):**

- Which specific rooms it can access
- Read or read-write per room
- When access was granted
- Last access timestamp
- Downgrade to read-only option
- Full revoke option

Empty state: no apps connected. When an app requests access, the request appears here before anything is shared.

### MCP / AI Access (`/ai`)

AI clients connected through MCP. The most sensitive management page — make the access visible and bounded.

**Active clients table:**
Columns: client name, auth type (OAuth / Token), status, token expiry, last used, connected rooms, revoke.

**Setup section:**
Six-client paths: Claude Desktop (token), Claude web (OAuth), ChatGPT web (OAuth), GitHub Copilot (token), Codex (token), OpenClaw (token).

**Per-client detail:**

- Auth type explanation
- Setup instructions
- Which rooms and collections it can read
- Which rooms it can write
- Rotate token / disconnect OAuth actions

**Activity log:**
Recent agent reads and writes: timestamp, client, action, room. (The data for this exists in `agentAccessLogs` — it needs a UI.)

Safety note: bearer tokens never appear in URLs. All setup flows stay on authenticated Eweser pages and mint tokens server-side.

### Account (`/account`)

Profile and identity.

- Display name, email
- Profile room data (portable identity)
- Linked OAuth providers (Google, GitHub)
- Change email

### Security (`/security`)

- Email verification status
- Password change
- TOTP 2FA: enable, manage, backup codes
- Active sessions list with revoke

### Access Grant Permission Prompt (`/access-grant/permission`)

A user arrives here from an external app that requested access. This is a boundary-crossing flow — the user needs to clearly understand what they are approving before they click.

Show:

- App name and domain
- What it is asking for: collections and scopes
- What it cannot access (everything else)
- Approve / Deny

Copy tone: calm and specific. No vague "this app wants to access your account." Name the exact collections and whether they are read or read-write.

## UX Review: First-Time Visitor Journey

**Reviewed against:** the landing page copy plan and connected-tools page as a first-time visitor would experience them. Not a developer, not someone who already knows what local-first or MCP means.

---

### Problem 1 — The hero explains the philosophy before explaining the product

The current hero headline is "Seize the data layer" (manifesto direction) or "Your data. Not their moat." Both are defiant and memorable but tell you nothing about what EweserDB _is_ or what you can actually _do_.

"Local-first database for user-owned software" as a kicker is developer language. A regular person who uses Evernote or keeps notes in Notion doesn't know what a local-first database is or why they should care.

The hero body ("EweserDB is a local-first interoperable database for apps that refuse lock-in") is similarly abstract. By the end of the hero the visitor knows that EweserDB is philosophically aligned with them, but has no concrete idea what it does.

**Fix:** The hero needs one concrete sentence that names what you get. Something like: _"Take Ewe Note — a notes app where your notes live on your device, not their server. Or connect your AI tools to your own data instead of theirs. That's EweserDB."_ Then the philosophy lands as context, not as the explanation.

---

### Problem 2 — Two audiences with no routing

The product has two distinct audiences with completely different entry points:

- **End users** (non-developers): people who want offline-first notes, want to connect their AI memory to something they own, or are tired of app lock-in.
- **Developers**: people who want to build apps on a user-owned data layer without rolling their own backend.

The current plan mixes these throughout. The hero tries to speak to both. Sections 01–03 speak to users. Section 05 speaks to developers. Section 04 (Connected Tools) is a product nav panel that speaks to neither clearly.

Neither audience gets a path that feels designed for them.

**Resolved:** The nav includes a **Developers** item that routes developers directly to the SDK/build content. This handles the routing without needing a separate page or hero-level fork. The hero stays user-focused. Developers who land on the page and don't see themselves in the first few sections will find their path in the nav.

---

### Problem 3 — CTAs assume knowledge the visitor doesn't have yet

"Connect my AI" as the primary CTA assumes the visitor knows what MCP is, has an AI client, and understands why EweserDB is the right place to connect it. "Try Ewe Note" assumes they know what Ewe Note is.

**Ewe Note positioning constraint (resolved):** Ewe Note should not be sold too hard as the primary entry point. The risk is that visitors conclude EweserDB is just a notes app. Ewe Note is a proof point — the clearest demonstration that the data layer works — but the pitch is the ecosystem, not the notes app. It should appear as "the first app built on EweserDB" or "the demo app", not as the product itself.

**Fix:** Give both CTAs a one-liner that sets expectations:

- "Try Ewe Note — a notes app built on EweserDB. No account needed."
- "Connect my AI — link Claude, ChatGPT, or Copilot to your own data layer."

For visitors who aren't sure which applies, a third softer path: "Explore what's possible →" pointing to the Apps page.

Consider framing Ewe Note in the hero as an example rather than a destination: _"Take Ewe Note: a notes app where your notes live on your device. That's what building on EweserDB looks like."_

---

### Problem 4 — Four sections of argument before one moment of product

After the hero, the page delivers:

- § I: The Problem (apps are bad landlords)
- § II: The Reversal (old world vs EweserDB world comparison)
- § III: The Collective (ecosystem feature cards)
- § IV: Connected Tools (management UI preview)
- § V: Developers
- Final CTA

A first-time visitor has to read through five sections of philosophy and comparison before getting any sense of what they actually do today. The feature cards in § III are the closest the page comes to showing concrete capabilities, but they're still aspirational descriptions rather than "here's what you can do right now."

**Fix:** Add a "what you can do today" moment early — either as part of the hero or as its own short section immediately after the hero, before the problem/philosophy sections. Show three concrete things: try notes, connect AI, build an app. Then the argument sections justify those things rather than promising them in the abstract.

---

### Problem 5 — The "Connected Tools" section on the landing page is confusing

Section § IV previews the app shell management surfaces (Personal Data, Connected Apps, MCP/AI, User Auth) as if they are destinations to explore. Those are the control panel _after_ sign-up — they have no meaning to someone who hasn't yet decided to use the product.

**Resolved:** "Connected Tools" is retired as a nav label. The landing page nav uses **Apps** and **MCP** as separate items instead. The landing page section that currently previews these management surfaces should be replaced with a concrete preview of what apps exist and what MCP connections are available — content that belongs on the public Apps and MCP pages. The management surfaces (connected apps dashboard, AI access control) are a separate thing that only makes sense once someone has signed up.

---

### Problem 6 — No visible "zero to something" path

By the end of the page a first-time visitor understands the values, the problem, and the ecosystem scope. But they don't have a clear mental model of:

- What do I do first?
- What happens when I sign up?
- How does my data get into EweserDB?
- If I try Ewe Note, does it connect to EweserDB automatically?

This is the most important gap. The UX needs a lightweight "how it works" or "getting started" moment that shows the flow: create account → sign in to Ewe Note → your notes live in your EweserDB → connect AI → AI reads your notes from your data layer, not from their servers.

It doesn't need to be a detailed tutorial. Two or three steps as a visual sequence would close most of the comprehension gap.

---

### Problem 7 — The Developers section is buried below four user-facing sections

Developers are a high-value audience and the most likely group to try building with EweserDB today. Putting them at section 5, after the problem, the reversal, the ecosystem, and the connected tools preview, means they have to scroll a long way before they get anything technically useful.

**Resolved:** The nav includes a **Developers** item that jumps directly to the developer section. Developers who land on the page and don't see themselves in the first few sections will find their path without scrolling. The section itself stays roughly where it is in the page order — the nav anchor is enough.

---

### Summary of decisions

| Issue                         | Decision                                                                                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Connected Tools" nav label   | ✅ Retired. Split into **Apps** and **MCP** as separate nav items.                                                                                               |
| Developer routing             | ✅ **Developers** nav item anchors directly to the developer section.                                                                                            |
| Ewe Note as primary CTA       | ✅ Ewe Note is framed as a proof point / first app, not the product. "Connect my AI" and "Explore" are the primary CTAs.                                         |
| One page vs separate pages    | ✅ Separate pages: `/apps`, `/mcp`, `/manifesto`, `/developers`.                                                                                                 |
| Hero concrete explanation     | ⚠️ **Open.** Hero needs a sentence that names what you get, not just the philosophy.                                                                             |
| "How it works" sequence       | ⚠️ **Open.** Add a 3-step visual sequence after the hero: account → Ewe Note / AI → data stays yours.                                                            |
| App management vs public apps | ✅ Two separate concepts: public Apps/MCP pages (what can I connect?) vs app shell /apps and /ai (what have I connected?). CTAs link between them after sign-up. |

---

---

## Story Sources

Reference stories for copywriting. Use these to find the right angle for a section. Not all meant to appear on the landing page at once. Do not copy verbatim into product pages.

### Notes App Trust

If you've ever trusted a notes app for years, you know the fear: one sync bug, shutdown, bad export, or product turn can put your accumulated work at risk.

EweserDB answer:

Your notes live in a user-owned data layer. Apps can change. Your work stays yours.

### Learning Data Behind Glass

Duolingo-style learning apps are great at streaks and habits. They are much worse at letting you reuse your own learning history in another tool.

EweserDB answer:

Study tools can connect to the same notes and records instead of forcing another import/export cycle.

### Leaving An Ecosystem

Leaving a large ecosystem should not mean rebuilding your digital life piece by piece.

EweserDB answer:

The database belongs to the user. Apps and services request access instead of becoming the place your life gets trapped.

### Trying New Apps

Trying a new app should feel like changing views, not moving houses.

EweserDB answer:

New apps can meet the user where their data already lives: rooms, schemas, permissions, sync state, and history included.

### Lightweight AI Notes

Some people want an Obsidian-scale knowledge base. Others just want simple notes, local sync, and clear review of what an AI assistant read or changed.

EweserDB answer:

AI access should be easy to connect, scoped by permission, and reviewable by the user.

### Micro Apps

Big apps collect users, histories, and feature requests until they become bloated. EweserDB makes it easier to build lightweight apps for narrow use cases because the app does not need to own the whole backend or the whole user relationship.

EweserDB answer:

You do not need one app that does everything for everyone. You can have many focused views over the same data.

### Developer Without A Backend

A developer should be able to drop in a library, build a useful interface, and immediately work with the user's existing rooms, schemas, and documents instead of building auth, sync, storage, import/export, and onboarding from scratch.

EweserDB answer:

Build the app. Not the prison.

### Fast, Local, Responsive

Most app backends are built to manage huge amounts of data from millions of users. A personal user-owned database is tiny by comparison, even when it contains a lot of someone's life. That makes local-first apps feel fast, responsive, and available offline.

EweserDB answer:

Your software should not feel slow just because a remote platform owns your data.

### Personal Data For AI

AI becomes more useful when it can work with the user's actual notes, documents, history, preferences, and decisions. But that context should belong to the user, not to one AI vendor or cloud provider.

EweserDB answer:

Your AI should work from your data layer, under your permissions.

### Local-First Signal

"Own your data in spite of the cloud" is a strong local-first signal. It should appear as a manifesto line or supporting phrase, but clearer user-facing copy should carry the main page.

EweserDB answer:

The cloud can help sync and connect your software without becoming the owner of your work.

### Future: Personal Sharing

Future-facing: user-owned rooms, permissions, sync, and file storage connections could support personal/family sharing, lightweight social networks, photo sharing, and small trusted networks.

EweserDB answer:

Sharing should be built around people and permissions, not platform captivity.

---

## Core Message

Short:

EweserDB is a local-first database users own and apps share.

Medium:

EweserDB gives users one data layer that survives app churn. New apps can work with the user's existing rooms, schemas, documents, and permissions instead of forcing another import, export, onboarding flow, or silo.

Long:

Most software traps your work inside product-specific databases. EweserDB reverses that model: the user owns the data layer, while apps and agents request scoped access to it. Users can try new tools without starting over. Developers can build focused apps without rebuilding auth, sync, storage, sharing, and import/export from scratch.

## Audience Promises

> **Internal reference only.** This section captures promise sources for copywriting. Do not copy verbatim into product pages. If a public-facing version is needed, move it to a separate file (e.g. `docs/ai/plans/2026-04-27-audience-promises-public.md`).

### For Users

- Your notes, files, learning work, decisions, and context should not disappear because one app breaks.
- Trying a new app should not mean abandoning years of accumulated work, or hours of effort.
- Offline-first apps should feel fast because your data is local first and synced second.
- You should be able to choose which apps and agents can access which parts of your data.
- Self-hosting should be possible for people who want the strongest ownership story.

### For Developers

- Build focused apps without rebuilding the whole backend.
- Start from the user's existing data, not a blank onboarding wizard.
- Use shared schemas when you want interop.
- Create micro apps for specific audiences and workflows instead of one bloated everything app.
- Let the app compete on interface and workflow quality, not data capture.

### For AI / Agent Workflows

- Give AI tools scoped access to user-owned context.
- Let users switch AI providers without losing the data layer their assistants rely on.
- Support local or self-hosted model workflows where privacy and ownership matter.
- Keep chat/provider hype out of the core promise: EweserDB is the data layer.
