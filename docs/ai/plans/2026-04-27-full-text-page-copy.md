## Goal

Create the full text-only copy source for the current EweserDB page set before Figma or code polish resumes.

This document replaces the next-step Figma pass for now. It is meant to answer: what exact words should each page use, and which features are real today versus planned or future-facing?

## Status Legend

- **Shipped**: implemented in the current repo or documented as completed.
- **Planned**: intended product/UI surface from current design plans, not fully implemented as a production page yet.
- **Future-facing**: aspirational or later-phase. Keep only when useful for explaining the product shape; do not present as already available.

## Source Check

Checked against:

- `docs/ai/plans/2026-04-27-core-copy-deck.md`
- `docs/ai/plans/2026-04-27-authenticated-surfaces-design-pass.md`
- `docs/ai/plans/completed/2026-04-24-mcp-connect-ux-and-oauth.md`
- `packages/landing/src/pages/index.astro`
- `packages/app/src/pages.tsx`
- `packages/app/src/components/connect-ai-page.tsx`
- `packages/auth-server-hono/src/routes/connect-ai.ts`
- `packages/mcp-server/README.md`
- `packages/ewe-note/src/app/pages/Settings.tsx`
- `packages/shared/src/collections/index.ts`

## Current Feature Reality

### Shipped

- Local-first TypeScript SDK around Yjs rooms/documents.
- Shared collection keys: `notes`, `flashcards`, `profiles`, `agentConfigs`, `agentAccessLogs`, `conversations`.
- Ewe Note app with notes, folders, pinned/recent/tasks views, editor, local-first sync, settings, sign-in, sign-out, and folder sharing UI.
- Auth pages for sign in, sign up, email confirmation, password reset, verify email, two-factor challenge, account home, account security, and access grant approval.
- Auth server with better-auth, email/password, Google/GitHub social sign-in hooks, verified email flow, TOTP 2FA, OAuth server routes, access grants, room invites, and sync token refresh.
- Connect AI page for Claude Desktop, Claude web, ChatGPT web, GitHub Copilot, Codex, and OpenClaw.
- Remote `/mcp` endpoint accepting OAuth bearer tokens and agent tokens.
- MCP tools for rooms, documents, search, create/update/delete, and `eweser_save_memory`.
- Claude web and ChatGPT web use OAuth remote HTTP MCP.
- Claude Desktop, Copilot, Codex, and OpenClaw use token-backed setup/fallback paths in this pass.
- Agent token status, expiry, last used, rotate, and revoke controls.
- Agent access logs exist at the data-model level.

### Planned

- Personal Data Home as the main authenticated control plane.
- Connected Apps and Permissions as a full app-permissions dashboard.
- MCP / AI Access as a richer control plane beyond the current Connect AI setup page.
- Scope inspector, recent app access, downgrade controls, schema/sync summaries, storage/recovery summaries, and audit-style activity UI.
- Dedicated public Connected Tools page listing available apps and MCP access.

### Future-facing

- File storage providers for photos, attachments, and larger blobs.
- Personal/family sharing beyond current room invite and folder sharing flows.
- Lightweight social or trusted-network sharing.
- Marketplace-like third-party app ecosystem.

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
- Connected Tools

Avoid in public copy:

- Surfaces
- paradigm
- generic AI memory hype

## Landing Page

Status: **Planned copy, partially shipped in `packages/landing`**

### Header

Brand:

EweserDB

Navigation:

- Manifesto
- Connected Tools
- Developers
- Docs

Primary action:

Explore connected tools

Secondary action:

Sign in

Implementation note:

The nav "Connected Tools" link should point to the dedicated public Connected Tools page (`/connected-tools`) when that page ships. Until then it links to the `#apps-mcp` section on the landing page. The primary header CTA is currently "Open Ewe Note" in the shipped code. The planned copy shifts the primary CTA to the dual-path journey: "Connect my AI" and "Try Ewe Note".

### Hero

Kicker:

Local-first database for user-owned software

Headline:

Your data. Not their moat.

Body:

EweserDB is a local-first interoperable database for apps that refuse lock-in. Notes, AI agents, documents, knowledge management, study tools, and collaborative workspaces can all connect to the same user-owned data layer.

Primary CTA:

Connect my AI

Secondary CTA:

Try Ewe Note

Diagram labels (current shipped labels):

- User Auth
- User-owned data core
- MCP Access
- Personal Data
- Connected Apps

Diagram note:

Apps and AI agents orbit the user's data layer. They do not own it.

### Problem

Section label:

01 // The Problem

Headline:

Apps became landlords.

Body:

Modern software treats your notes, documents, decisions, relationships, and learning work like platform property. You spend years building context, then a bug, shutdown, bad export, or bloated product roadmap can put that work out of reach.

Old world:

- The app owns the database.
- Your context stays trapped in one product.
- Collaboration requires everyone to use the same platform.
- AI agents only help if you copy your life into them.
- Trying something new means starting from zero.
- Export is an escape hatch, not a workflow.

EweserDB world:

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

App-owned data:

- Notes app owns notes on their servers
- Study app silos your flashcards and learning history
- AI tool owns context
- Every new tool starts empty
- Features bloat apps because one app must satisfy all use cases

User-owned data:

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

### Connected Tools

Section label:

04 // Connected Tools

Headline:

Apps connect. You stay in control.

Body:

See every connection, scope, and grant in one place. Approve access, revoke it, and know exactly what each app can touch.

Cards:

User-owned auth

Sign in, approve scopes, manage account trust, and keep app access visible.

Personal data

See collections, schemas, rooms, sync state, storage, sharing, and recovery.

Connected apps

Review installed apps, granted scopes, recent access, and revoke controls.

MCP / AI access

Connect AI clients through scoped grants, setup flows, and audit-style visibility.

Future storage

Future-facing: connect file storage providers for photos, attachments, and larger blobs while keeping EweserDB focused on sync, permissions, metadata, and app interop.

Feature status notes:

- User-owned auth: **Shipped**.
- Personal data control plane: **Planned**.
- Connected apps dashboard: **Planned**, with access grants **shipped**.
- MCP / AI access: **Shipped** as Connect AI setup; richer audit dashboard is **planned**.
- Future storage: **Future-facing**.

### Developers

Section label:

05 // Developers

Headline:

Build the app. Not the prison.

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

Better tools without starting over.

Body:

Connect your AI client, try the demo app, or read the docs to start building.

Primary CTA:

Connect my AI

Secondary CTA:

Try Ewe Note

Tertiary CTA:

Read the docs

Footer phrase:

"Ewe-ser", pronounced "user". Because you are.

## Personal Data Home

Status: **Planned page — target for first design release. Required before public launch.**

Purpose:

The authenticated control plane. Not another app — the layer that apps connect to. Users need this before the landing page promises about "see every connection and grant" can be made honestly.

---

### Header

Eyebrow:

Personal Data

Primary headline:

Your data layer.

Sub-headline:

Everything connected apps can see is managed from here. Collections, rooms, sync state, app access, and AI grants — all yours.

Primary actions:

- Connect AI
- Connect an app
- Open Ewe Note

---

### Quick Stats Bar

Labels and values (show live counts, dash when zero):

- Collections — [N]
- Rooms — [N]
- Connected apps — [N]
- AI grants — [N]
- Storage — [size or "Calculating…"]
- Last synced — [timestamp or "Never"]

---

### Section: Data Overview

Section label:

Your collections

Section body:

Your data is organized into collections. Each collection holds a type of record. Apps connect to collections and rooms — not the whole database.

Collection rows:

Notes
Shared notes, documents, links, and working context.
[Room count] · [Last updated]

Flashcards
Study material linked back to notes and source context.
[Room count] · [Last updated]

Profiles
Portable account and identity data for Eweser apps.
[Room count] · [Last updated]

Agent configs
AI client setup, scope, status, expiry, and revocation state.
[Count] · [Last updated]

Agent access logs
Records of agent reads and writes against rooms.
[Count] · [Last updated]

Conversations
AI conversation summaries, session notes, decisions, and memory entries.
[Room count] · [Last updated]

Feature status note: All collection keys above are **shipped**. The UI browsing them is **planned**.

---

### Section: Rooms

Section label:

Where data lives

Section body:

Rooms are the permission and sync boundary. Each room belongs to a collection. Apps and AI agents connect to specific rooms — not the whole data layer.

Table labels:

- Room name
- Collection
- Sharing
- Last synced
- Actions

Empty state:

No rooms yet.

Empty state body:

Apps create rooms when you grant them access. Your first room is created when you sign in to Ewe Note or approve a connected app.

---

### Section: Sync and Storage

Section label:

How your data moves

Section body:

Data is stored locally first. Sync keeps rooms up to date across devices without making the cloud the owner.

Status rows:

- Homeserver — [URL or "Not connected"]
- Local storage — [size or "Calculating…"]
- Last synced — [timestamp or "Never"]
- Sync status — Connected / Offline / Syncing

Recovery note (planned):

Export, backup, and self-hosted recovery controls are planned for this section. Do not display until implemented.

---

### Section: Sharing

Section label:

Who has access

Section body:

Sharing uses room invites and folder grants. You control which people and apps can reach which rooms.

Links:

- Manage app access →
- Manage AI access →

---

### Section: Connected Apps (summary)

Section label:

Apps connected to your data

Section body:

Apps that have been granted access to your rooms or collections.

Table labels:

- App
- Domain
- Scopes
- Last access
- Revoke

Empty state:

No connected apps yet.

Empty state body:

When an app requests access to your data, the request will appear here before anything is shared.

Action:

Manage all app access →

---

### Section: AI / MCP Access (summary)

Section label:

AI clients with access

Section body:

AI clients and AI agents that can read or write through MCP.

Table labels:

- Client
- Auth type
- Status
- Last used
- Revoke

Empty state:

No AI clients connected yet.

Actions:

- Manage AI access →
- Connect a new AI client →

---

Feature status notes:

- All collection keys are **shipped**.
- Rooms, sync state, and access grant data exist in the auth server and are **shipped** at the data layer.
- The Personal Data Home UI is **planned** — this is the full target copy for the first design pass.
- Storage and recovery display are **planned** and should stay hidden until implemented.
- The Connected Apps and AI Access summaries link to the full pages; the full pages are **planned**.

## Connected Apps And Permissions

Status: **Planned page, backed by shipped access grants**

Purpose:

Make app access visible, understandable, and revocable.

Primary headline:

Every app asks first.

Body:

Review which apps can access your data, what scopes they have, when they last connected, and what you want to revoke.

Primary blocks:

Installed apps

Apps you have already allowed to access rooms or collections.

Pending requests

Apps waiting for you to approve or deny access.

Recent access

Planned: recent app activity grouped by app, room, and action.

Scope inspector

Review collections, specific rooms, read access, and write access before changing a grant.

Revoke or downgrade

Remove access entirely or reduce an app to a narrower scope.

Table labels:

- App
- Domain
- Scopes
- Collections
- Rooms
- Last access
- Status

Scope labels:

- Read
- Read/write
- Collections
- Rooms
- Metadata
- Sharing

Empty state:

No connected apps yet.

Empty state body:

When an app asks to use your EweserDB data, the request will appear here before anything is shared.

Feature status notes:

- Access grant creation and permission approval are **shipped**.
- A full connected-apps dashboard, recent access for apps, and downgrade UI are **planned**.
- Do not imply a third-party marketplace is live.

## MCP / AI Access

Status: **Shipped as Connect AI setup, planned as richer MCP control plane**

Purpose:

Make AI access feel powerful but bounded.

Primary headline:

You choose what AI can see.

Body:

Connect AI clients through scoped access. Choose what they can read, what they can write, and which collections they can touch.

Top safety copy:

Never place bearer tokens in URLs. Setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.

Primary actions:

- Connect a client
- Rotate token
- Revoke access

Secondary actions:

- Account security
- OAuth metadata

Setup page intro:

Use the auth path each client actually supports today. OAuth stays on remote HTTP clients. Token bootstrap stays on local or fallback clients. Never place bearer tokens in URLs. All setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.

Client cards:

Claude Desktop

Local stdio setup with `@eweser/mcp` and a short-lived agent token.

Action:

Prepare setup

Setup instructions:

Paste this into Claude Desktop config, then restart Claude Desktop.

Claude web

Remote HTTP MCP on `/mcp` with OAuth in Claude.ai connectors.

Action:

Open connector flow

Steps:

- Open Claude.ai connectors and add the Eweser MCP URL.
- Use the Eweser OAuth flow when Claude prompts for sign-in.
- Return here to revoke access if you want Claude to disconnect.

ChatGPT web

Remote HTTP MCP on `/mcp` with OAuth in ChatGPT developer mode.

Action:

Open connector flow

Steps:

- Enable ChatGPT developer mode in Settings before importing the MCP URL.
- Add the Eweser MCP URL as a custom connector and complete the OAuth prompt.
- Return here to revoke access or inspect the OAuth metadata endpoint.

GitHub Copilot

Remote HTTP MCP config for Copilot using a bearer token fallback.

Fallback reason:

Copilot cloud agent docs currently call out that remote OAuth-backed MCP servers are not supported there, so this launch ships the explicit token path.

Action:

Prepare setup

Setup instructions:

Use this as a remote HTTP MCP fallback until verified Copilot OAuth client metadata is shipped for Eweser.

Codex

Remote HTTP MCP config for Codex using `bearer_token_env_var`.

Fallback reason:

Codex remote MCP config is supported, but Eweser is not shipping verified first-party OAuth client metadata for Codex in this pass.

Action:

Prepare setup

Setup instructions:

Add this to `~/.codex/config.toml`, set `EWESER_MCP_TOKEN` in the environment that launches Codex, then fully restart Codex. A repo `.env` file alone is not enough for native MCP startup.

OpenClaw

Remote HTTP MCP config with an explicit Authorization header.

Fallback reason:

OpenClaw docs currently document remote HTTP headers, not a verified remote OAuth flow worth launching here.

Action:

Prepare setup

Setup instructions:

Use this remote HTTP MCP definition in OpenClaw with an explicit Authorization header.

Status labels:

- OAuth
- Token
- Connected
- Not connected
- Permission
- Expires
- Last used
- Not issued
- Not yet used

Feature status notes:

- Six-client Connect AI setup is **shipped**.
- OAuth for Claude web and ChatGPT web is **shipped**.
- Token-backed Claude Desktop, Copilot, Codex, and OpenClaw paths are **shipped**.
- Agent status, expiry, last used, rotate, and revoke are **shipped**.
- Rich audit-style activity UI is **planned**. Agent access logs exist, but the polished control plane does not yet.
- Folder-scoped write defaults are **planned** in `2026-04-27-mcp-folder-scoped-ai-access.md`; do not present as finished.

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
