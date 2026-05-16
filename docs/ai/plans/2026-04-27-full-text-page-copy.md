# EweserDB: Full Page Copy

Voice direction and headline pool: `2026-04-27-core-copy-deck.md`
Page architecture and UX decisions: `2026-04-27-product-decisions.md`

---

## Landing Page Copy

### Header

Brand:

EweserDB

Navigation:

- Manifesto
- Apps
- MCP
- Developers
- Docs

Primary action:

Connect my AI

Secondary action:

Sign in

### Hero

Graphic:
Own Your Own Data

Kicker:

A homestead for your data.

Headline:

Your data is not their pasture.

Sub-headline (under hero, above CTAs — the punk-sheep rebuttal):

The flock follows the platform. Ewe don't have to.

Body:

EweserDB is a personal data layer rooted on your device. Apps and AI agents connect to it with your permission — they don't store your data, they read and write through scoped access you can revoke. Local-first, synced across your devices, and self-hostable any time.

Primary CTA:

Connect my AI

CTA sublabel:

Let Claude, ChatGPT, or Copilot read from a data layer you control.

Secondary CTA:

Try Ewe Note

CTA sublabel:

A notes app rooted on your device. Drop-in for Obsidian and Karpathy-wiki vaults, extended to every app and agent you connect.

Tertiary CTA:

Explore what's possible

CTA sublabel:

See available apps and AI connections.

Diagram note:

Apps and AI agents orbit the user's data layer. They do not own it.

### How It Works

Section label:

00 // How it works

Headline:

Three steps to owning your data.

Steps:

1. **Create an account.** Your profile and data live in 'rooms' you can provision access to.
2. **Connect your tools.** Sign in to Ewe Note, connect an AI client, or install an app — each one asks for scoped access, not the whole database.
3. **Your data stays yours.** Switch apps. Revoke access. Take your data anywhere. The database belongs to you, not the platform.

---

### Problem

Section label:

01 // The Problem

Headline:

Apps became landlords.

Body:

Modern software treats your notes, documents, decisions, relationships, and learning work like platform property. You spend years building context, then a bug, shutdown, bad export, or bloated product roadmap can put that work out of reach.

The old enclosure:

- The app owns the database.
- Your context stays trapped in one product.
- Collaboration requires everyone to use the same platform.
- AI agents only help if you copy your life into them.
- Trying something new means starting from zero.
- Export is an escape hatch, not a workflow.

The open field:

- You own the database.
- Apps compete on experience, not captivity.
- Collaboration can happen over shared user-owned data.
- AI agents get scoped, reviewable access.
- New apps can begin with the user's existing data.
- The cloud can sync without becoming the owner.

Pull quote:

Own the substrate. Swap the interface.

### Model Shift

Section label:

02 // The Reversal

Headline:

Switch apps. Keep your work.

Body:

EweserDB separates the data layer from the app layer. Your rooms, documents, schemas, permissions, and sync state live in a user-owned system. Apps connect to that system when you allow them, then compete on what they help you do.

App-owned data (the old enclosure):

- Notes app owns notes on their servers
- Study app silos your flashcards and learning history
- AI tool owns context
- Every new tool starts empty
- Features bloat apps because one app must satisfy all use cases

User-owned data (the open field):

- One personal data layer
- Many compatible interfaces
- Scoped access for apps and AI agents
- Shared schemas for interop
- New tools can start useful on day one
- Lightweight apps can serve specific workflows

### Ecosystem

Section label:

03 // Ecosystem

Headline:

One sheep. All your data. With you anywhere.

Body:

Notes are one proof point. The bigger story is a user-owned data layer that can feed focused apps, AI agents, collaboration, study tools, and personal knowledge workflows.

Cards:

AI + MCP

Connect all your AI tools to the same user-owned data layer. Scoped access, unified data, and audit visibility for all your AI agents.

Collaborative notes

Shared rooms, offline-first editing, and conflict-free sync across devices.

Knowledge base

Linked records, notes, references, and documents that other apps can understand.

Study tools

Turn the same notes into flashcards, quizzes, summaries, and review flows without exporting your work into another silo.

Micro apps

Instead of plugins, build small, focused interfaces for specific workflows without making each app own the user's whole world.

Personal sharing

Future-facing: share rooms, files, photos, and family context through user-controlled permissions instead of platform captivity.

Feature status notes:

- AI + MCP: **Shipped** for MCP connection paths and tools; richer review UI is **planned**.
- Collaborative notes: **Shipped** as local-first notes and shared rooms/folder sharing; broader collaboration UX is **planned**.
- Knowledge base: **Shipped** for notes, refs, conversations, and search primitives; richer knowledge-base UI is **planned**.
- Study tools: **Partially shipped** through `flashcards` schema/examples; polished study app is **planned**.
- Micro apps: **Shipped as architecture/examples**, marketplace is **future-facing**.
- Personal sharing: **Future-facing**, with room/folder sharing as the current shipped base.

### Apps

Section label:

04 // Apps

Headline:

Apps that work with your data, not against it.

Body:

Every app built on EweserDB asks for the access it needs. Nothing more. You grant it, you revoke it, and the data stays in your layer the whole time.

App cards:

Ewe Note

A writing and knowledge app that stores your notes on your device. Works offline. Syncs across devices when you're connected. Your first app built on EweserDB.

CTA: Open Ewe Note

More apps coming

Flashcards, publishing tools, AI memory review, personal knowledge bases, and more — all built on the same data layer.

CTA: Explore the ecosystem →

Build your own

EweserDB is open. Build a focused app that works with the user's existing data instead of starting another silo.

CTA: Read the developer docs →

---

### MCP / AI Connections

Section label:

04b // MCP

Headline:

Give your AI a memory it can't take with it.

Body:

Connect Claude, ChatGPT, Copilot, and other AI clients to your EweserDB data layer through MCP. They can read your notes and context under scoped, revocable permissions. When you switch AI providers, the data stays — because it was yours to begin with.

Supported clients:

- Claude Desktop — local stdio token
- Claude web — OAuth via Claude.ai
- ChatGPT web — OAuth via developer mode
- GitHub Copilot — token
- Codex — token via config
- OpenClaw — explicit Authorization header

CTA: Connect my AI

CTA sublabel:

Requires an account. Takes about two minutes.

Feature status:

- MCP connection setup for all six clients: **Shipped**.
- Scoped room-level access: **Shipped**.
- Activity log UI: **Planned**.

### Developers

Section label:

05 // Developers

Headline:

Build the app. Not the enclosure.

Body:

EweserDB gives developers a local-first database, shared schemas, Yjs CRDT sync, and MCP-ready access patterns so they can build useful apps without inventing another proprietary backend.

Install command:

`npm install @eweser/db yjs`

Proof points:

- Type-safe schemas
- Real-time CRDT sync
- Shared app interop
- Self-hostable stack
- Scoped MCP access
- Local-first storage
- Existing user data on first launch
- Micro-app friendly

Secondary CTAs (bottom of Developers section — quality signals):

- Self-host on Railway (one-click deploy link)
- View on GitHub

Implementation note: The current shipped landing page (`packages/landing`) already includes a "Self-host it" Railway link and a GitHub link. These must remain visible at the bottom of the Developers section on the main landing page. They function as trust signals — open source and self-hostable are differentiators, not just docs footnotes.

Feature status notes:

- Type-safe schemas: **Shipped**.
- Real-time CRDT sync: **Shipped**.
- Shared app interop: **Shipped as package/examples**, broader ecosystem **planned**.
- Self-hostable stack: **Shipped as Docker/deployment work in progress**, production polish **planned**.
- Scoped MCP access: **Shipped**.
- Existing user data on first launch: **Shipped as room/access architecture**, product UI **planned**.
- Micro-app friendly: **Shipped as architecture/examples**.
- Self-host / GitHub links: **Shipped in current landing page**. Must be preserved.

### Final CTA

Headline:

Bring it home.

Body:

Connect your AI client, try Ewe Note, or view developer tools and start building.

Alt headline (use on a Manifesto/About page if a punchier closer is needed):

The revolution is self-hostable.

Primary CTA:

Connect my AI

CTA sublabel:

Link Claude, ChatGPT, or Copilot to your own data.

Secondary CTA:

Try Ewe Note

CTA sublabel:

No account needed. Your notes, your device.

Tertiary CTAs:

- Read the docs
- Self-host it (Railway one-click deploy)
- View on GitHub

Footer phrase:

"Ewe-ser", pronounced "user". Because ewe are.

## Global Product Language

Use:

- EweserDB
- user-owned data
- local-first
- apps
- AI agents
- rooms
- schemas
- collections
- permissions
- sync

Avoid in public copy:

- Surfaces
- paradigm
- generic AI memory hype
- "local-first database" as the lead explanation (developer language — use it to support, not to open)

## App Shell: Management Pages Copy

These are the authenticated pages at `app.eweser.com`. Copy should be calm, functional, and utility-first. No manifesto tone here — that lives on the marketing site.

### Data Home (`/`)

Eyebrow:

Your data layer

Primary headline:

Everything your apps can touch.

Sub-headline:

Collections, rooms, connected apps, AI grants, and sync state — all visible from one place. Nothing shares your data without appearing here first.

Quick stats bar labels:

- Collections
- Rooms
- Connected apps
- AI grants
- Storage
- Last synced

Collections section headline:

Your collections

Collections section body:

Your data is organised into collections. Each collection holds one type of record. Apps and AI agents connect to specific rooms inside a collection — not the whole database.

Collection row format:
[Name] — [Description] — [Room count] · [Last updated]

Collection descriptions:

- **Notes** — Notes, documents, links, and working context.
- **Flashcards** — Study material linked back to notes and source context.
- **Profiles** — Portable identity and account data for Eweser apps.
- **Agent configs** — AI client setup, scope, status, expiry, and revocation state.
- **Agent access logs** — Records of agent reads and writes against your rooms.
- **Conversations** — AI conversation summaries, session notes, decisions, and memory entries.

Rooms section headline:

Where your data lives

Rooms section body:

Each room is a sync and permission boundary. Apps connect to specific rooms — granting access to one room does not expose others.

Rooms table columns: Room name · Collection · Sharing · Last synced · Actions

Rooms empty state:

No rooms yet. Rooms are created when you connect an app or sign in to Ewe Note.

Sync section headline:

How your data moves

Sync section body:

Data lives on your device first. The sync server keeps your rooms up to date across devices without becoming the owner of your work.

Sync status rows: Homeserver · Local storage · Last synced · Status

Connected apps section headline:

Apps with access

Connected apps table columns: App · Domain · Scopes · Last access · Revoke

Connected apps empty state:

No apps connected yet. When an app requests access to your data, the request appears here before anything is shared.

AI clients section headline:

AI clients with access

AI clients table columns: Client · Auth type · Status · Last used · Revoke

AI clients empty state:

No AI clients connected yet.

Primary actions (page level):

- Connect AI
- Connect an app
- Open Ewe Note

---

### Connected Apps (`/apps`)

Eyebrow:

Connected apps

Primary headline:

Every app asks first.

Body:

Review which apps can access your data, what scopes they have, when they last connected, and what you want to revoke. Nothing is shared without showing up here.

Main table columns:

App · Domain · Collections · Scopes · Rooms · Last access · Status · Actions

Scope labels:

- Read
- Read/write

Pending requests section headline:

Waiting for your approval

Pending requests body:

These apps have requested access to your data. Review the collections and scopes they need before approving.

Scope detail labels (per app, expandable):

- Collections accessible
- Specific rooms
- Access level per room
- Access granted on
- Last accessed
- Options: Downgrade to read-only · Revoke access

Empty state:

No apps connected yet. When an app requests access to your data, the request appears here before anything is shared.

---

### MCP / AI Access (`/ai`)

Eyebrow:

MCP / AI access

Primary headline:

You choose what AI can see.

Body:

Connect AI clients through scoped access. Choose what they can read, what they can write, and which rooms they can touch. Everything that connects through MCP appears here.

Safety note (always visible):

Bearer tokens never appear in URLs. All setup and token generation stays on this page.

Active clients table columns:

Client · Auth type · Status · Expiry · Last used · Rooms · Actions

Per-client actions:

- Rotate token
- Revoke access
- View connected rooms

Activity log section headline:

Recent agent activity

Activity log columns:

Timestamp · Client · Action · Room

Activity log body:

A record of what each AI client read or wrote against your rooms.

Setup section headline:

Connect a client

Client cards:

Claude Desktop — Local stdio. Short-lived agent token.
Claude web — Remote HTTP MCP. OAuth via Claude.ai connectors.
ChatGPT web — Remote HTTP MCP. OAuth via ChatGPT developer mode.
GitHub Copilot — Remote HTTP MCP. Token fallback.
Codex — Remote HTTP MCP. `bearer_token_env_var` in config.
OpenClaw — Remote HTTP MCP. Explicit Authorization header.

Status labels:

OAuth · Token · Connected · Not connected · Expires · Last used · Not issued · Never used

---

### Account (`/account`)

Eyebrow:

Account

Primary headline:

Your identity, your profile.

Sections:

Profile

- Display name
- Profile room data (portable across Eweser apps)

Email and identity

- Current email
- Change email
- Linked OAuth providers (Google, GitHub)

---

### Security (`/security`)

Eyebrow:

Security

Primary headline:

Keep your account tight.

Sections:

Email verification — status, resend

Password — change password

Two-factor authentication — enable / manage TOTP, backup codes

Active sessions — list with revoke individual sessions

---

### Access Grant Permission Prompt (`/access-grant/permission`)

Purpose: a user arrives here from an external app that requested access. Make the decision clear.

Eyebrow:

Access request

Primary headline:

Grant access to your data layer.

Body:

Review the app, the domain it comes from, and exactly what it is asking for before approving. You can revoke this any time from your connected apps page.

Show clearly:

- App name
- Domain
- Requested collections (by name with description)
- Requested scope per collection (read / read-write)
- What it cannot access: everything not listed above

Actions:

- Approve access
- Deny

Denial copy:

Access denied. No data was shared.

## Ewe Note Settings

Status: **Shipped page**

Purpose:

Let the note app user inspect account and sync state without turning Ewe Note into the whole EweserDB control plane.

Header:

Settings

Section:

Account

Signed-in state:

Signed in

Signed-out state:

Not signed in

Actions:

- Sign in to sync
- Sign out

Section:

Sync

Label:

Homeserver

Body:

Notes are stored locally first and synced when connected.

Feature status notes:

- Account display, sign-in, sign-out, homeserver display, and local-first sync note are **shipped**.
- Full EweserDB data control, app permissions, and MCP review should live outside Ewe Note in the planned core control plane.

## Sign In Page

Status: **Shipped page, copy can be tightened later**

Eyebrow:

User-owned auth

Headline:

Sign in and own your data.

Body:

Open Ewe Note, connect an AI client, and manage what your apps can access — all from one account.

Bullets:

- One account for notes, AI connections, and connected apps.
- Per-app access grants — nothing shares your data without asking first.
- Your profile is stored in a room you own, not a vendor database.

Panel title:

Welcome back

Panel body:

Use email/password or continue with an OAuth provider.

Fields:

- Email
- Password

Actions:

- Sign in
- Google
- GitHub

Links:

- Need an account? Create one
- Forgot your password?
- Terms
- Privacy policy

Legal note:

By continuing, you agree to our Terms and Privacy policy.

Feature status notes:

- Email/password sign-in is **shipped**.
- Google/GitHub social actions are wired through better-auth client code; availability depends on environment/provider configuration.
- 2FA challenge is **shipped**.

## Sign Up Page

Status: **Shipped page, copy can be tightened later**

Eyebrow:

User-owned auth

Headline:

Create an account and take control of your data

Body:

Join EweserDB to connect your apps, AI clients, and tools to a data layer you actually own.

Bullets:

- Profile rooms keep your account data portable and user-owned.
- Start with one identity, then reuse it across apps.
- Per-app access grants — no vendor lock-in.

Panel title:

Create an account

Panel body:

Set up a shared identity for notes, demos, and future apps.

Fields:

- Name
- Email
- Password

Conditional block:

Complete the captcha challenge before creating your account.

Action:

Create account

Link:

Already have an account? Sign in

Feature status notes:

- Email/password signup is **shipped**.
- Turnstile captcha is **shipped behind config**.
- Email confirmation is **shipped**.

## Email Confirmation Page

Status: **Shipped page**

Eyebrow:

User-owned auth

Headline:

Confirm your email

Body:

We sent a confirmation link to your email address.

Panel title:

Check your inbox

Panel body:

A verification link was sent to your email address.

Bullets:

- Open the email we sent and follow the confirmation link.
- Once confirmed, return here to continue signing in.
- If the message does not arrive, check spam or try again.

Supporting copy:

We are waiting on your account confirmation before finishing the signup flow.

You can close this tab after clicking the confirmation link and come back to sign in.

## Password Reset Pages

Status: **Shipped pages**

### Forgot Password

Eyebrow:

User-owned auth

Headline:

Reset your password

Body:

Request a password reset link.

Panel title:

Password reset

Panel body:

Enter your account email and we will send reset instructions.

Field:

Email

Action:

Send reset link

Success message:

If an account exists, password reset instructions were sent.

### Reset Password

Eyebrow:

User-owned auth

Headline:

Set a new password

Body:

Set a new password for your account.

Panel title:

New password

Panel body:

Choose a new password for your Eweser account.

Field:

New password

Action:

Reset password

## Verify Email Page

Status: **Shipped page**

Eyebrow:

User-owned auth

Headline:

Verifying your email

Body:

We are validating your verification token now.

Panel title:

Email verification

Panel body:

This should only take a moment.

Success state:

Email verified. You can continue.

Error state:

Unable to verify your email.

## Two-Factor Challenge Page

Status: **Shipped page**

Eyebrow:

Two-factor authentication

Headline:

Confirm it is you

Body:

Second-factor verification is required to finish sign-in.

Panel title:

Verify code

Panel body:

Complete this step to continue to your account.

Bullets:

- Enter a code from your authenticator app.
- Use a backup code if needed.
- Codes expire quickly for safety.

Fields:

- Authenticator code
- Backup code

Actions:

- Verify
- Use backup code
- Use authenticator code

## Account Home

Status: **Shipped page, planned to be superseded by Personal Data Home**

Title:

Account

Signed-in body:

Signed in as {email}

Links:

- Connect AI
- Account security

Profile editor appears when enough profile rooms exist.

Feature status notes:

- Basic account home is **shipped**.
- Full Personal Data Home is **planned** and should replace this as the main authenticated product surface.

## Account Security

Status: **Shipped page**

Headline:

Account security

Body:

Email verification and two-factor protection controls.

Launch note:

Passkeys/WebAuthn are deferred for this launch because the current `better-auth` workspace version does not expose stable passkey plugin support.

Status label:

Email verified:

Values:

- Yes
- No

Actions:

- Resend verification email
- Enable 2FA
- Disable 2FA
- Regenerate backup codes
- Verify code

Fields:

- Current password
- TOTP URI
- Enter TOTP code

Generated section:

Backup codes

Feature status notes:

- Email verification controls are **shipped**.
- TOTP 2FA controls are **shipped**.
- Passkeys/WebAuthn are explicitly **planned/deferred**, not shipped.

## Request Permissions Page

Status: **Shipped page, copy should be upgraded to planned trust language**

Journey triggers — when this page appears:

1. **Ewe Note sign-in path**: user clicks "Sign in" from Ewe Note, is redirected to `login.eweser.com`, signs in or creates an account, then lands here to approve Ewe Note's access grant for the notes collection before being sent back.
2. **MCP / AI approval path**: user completes the OAuth or token setup for an AI client (e.g. Claude web OAuth flow) and this page appears to confirm the scopes being granted to that client.
3. **Any third-party app OAuth redirect**: any app that implements the Eweser OAuth flow will send the user through this page to approve or deny its access request.

Purpose:

Let a signed-in user review an app access request before the app receives a grant.

Current page title:

Grant permissions

Planned headline:

Grant access to your data layer.

Current body:

{appName} at {domain} is requesting access to your database.

Planned body:

Review the app, domain, requested collections, and scope before approving access.

Request summary labels:

- App
- Domain
- Requested access
- Collections
- Specific rooms
- Inactivity expiry

Controls:

All folders

Collections

Specific rooms

Cancel grant if inactive for

day(s)

Actions:

- Deny
- Allow access

Error states:

The access request is invalid.

Unable to load your rooms.

Unable to save permissions.

Feature status notes:

- Permission approval, selected collections, selected rooms, keep-alive days, deny, and allow are **shipped**.
- The label `All folders` is currently shipped, but `All accessible data` or `All requested collections` may be clearer for the core product UI.
- Scope copy should not imply fine-grained file/photo storage access until that exists.

## Accept Room Invite Page

Status: **Shipped route**

Purpose:

Accept a room invite and redirect the user into the requesting app.

Page title:

Accepting invite

Loading body:

Accepting your room invite...

Error body:

Unable to accept invite.

Feature status notes:

- Room invite acceptance is **shipped**.
- A richer invite review screen is **planned only if needed**.

## Public Connected Tools Page

Status: **Planned page**

Purpose:

Give visitors one non-jargony place to understand what they can try today.

Headline:

Let apps and AI agents ask permission.

Body:

Start with Ewe Note, connect supported AI clients, or build a focused app on top of the same user-owned data layer.

Signed-out state:

All connected tools are visible as a preview with a "Sign in to connect" or "Sign in to set up" prompt. No connection can be made without an account. Cards should display tool name, description, and the auth path (OAuth or token), but the action button routes to sign-in.

Signed-in state:

Cards become actionable. MCP setup flows, OAuth prompts, and token generation are available. Status badges show connection state per tool.

Sections:

Available now

- Ewe Note
- Claude Desktop
- Claude web
- ChatGPT web
- GitHub Copilot
- Codex
- OpenClaw

Developer paths

- `@eweser/db`
- `@eweser/mcp`
- Self-hostable auth and sync services

Coming later

- More focused apps
- Richer app permission dashboard
- File storage providers

Feature status notes:

- Do not present a marketplace as live.
- Ewe Note is the shipped proof point, not the whole product.
- MCP client setup is live behind sign-in.
- Signed-out preview state must show the tools without false impressions of immediate access.

## Copy Decisions

- Keep `Connected Tools` as the public label. It is clearer than `Apps/MCP`.
- Keep `Apps connect. You stay in control.` for the landing section.
- Use `Let apps and AI agents ask permission.` for the future public Connected Tools page.
- Keep future storage and personal sharing, but label them as future-facing wherever they appear.
- Remove all publishing mentions — feature scope is undefined.
- The two hero CTAs are `Connect my AI` and `Try Ewe Note`. Both must be visible and equally weighted on the landing page.
- `Connected Tools` nav link should point to the dedicated `/connected-tools` page when it ships, not just a section anchor.
- Personal Data Home is required before public launch. The full copy above is the design target.
- Use shipped client-specific MCP behavior exactly: Claude web and ChatGPT web OAuth; Claude Desktop, Copilot, Codex, and OpenClaw token-backed setup/fallback.
- Self-host and GitHub links must remain in the Developers section of the landing page as quality/trust signals.

## Page URLs and Hosting

Architecture decision resolved: `packages/app` expands into the full authenticated app shell at `app.eweser.com`. The Astro landing site stays at `eweser.com` for SEO. See `2026-04-28-app-shell-migration.md` for the migration plan.

| Page                     | URL                                    | Package                         |
| ------------------------ | -------------------------------------- | ------------------------------- |
| Landing                  | `eweser.com`                           | `packages/landing` (Astro, SSG) |
| Connected Tools (public) | `eweser.com/connected-tools`           | `packages/landing` (Astro, SSG) |
| Sign In                  | `app.eweser.com/sign-in`               | `packages/app` (React SPA)      |
| Sign Up                  | `app.eweser.com/sign-up`               | `packages/app`                  |
| Email Confirmation       | `app.eweser.com/confirm-email`         | `packages/app`                  |
| Forgot Password          | `app.eweser.com/forgot-password`       | `packages/app`                  |
| Reset Password           | `app.eweser.com/reset-password`        | `packages/app`                  |
| Verify Email             | `app.eweser.com/verify-email`          | `packages/app`                  |
| Two-Factor Challenge     | `app.eweser.com/two-factor`            | `packages/app`                  |
| Request Permissions      | `app.eweser.com/permissions`           | `packages/app`                  |
| Accept Room Invite       | `app.eweser.com/invite`                | `packages/app`                  |
| Personal Data Home       | `app.eweser.com/` (post-login default) | `packages/app`                  |
| Connected Apps           | `app.eweser.com/apps`                  | `packages/app`                  |
| MCP / AI Access          | `app.eweser.com/ai`                    | `packages/app`                  |
| Account Security         | `app.eweser.com/security`              | `packages/app`                  |
| Ewe Note                 | `note.eweser.com`                      | `packages/ewe-note` (Vite SPA)  |
