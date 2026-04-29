## Goal

Define the text content and information architecture for EweserDB core pages before visual design continues.

This file is the copy source of truth for the current core design pass. The purpose is to make the product story coherent in plain markdown first, then move it into a boxes-and-text Figma pass, then apply the punk/industrial visual system.

Update:

The current full page-by-page text source is `docs/ai/plans/2026-04-27-full-text-page-copy.md`. Use that file for exact copy across landing, data home, connected apps, MCP, settings, auth, and permission pages before returning to Figma.

## How This Doc Gets Used

1. Edit this markdown until the message hierarchy feels right.
2. Treat `Current copy` items as the source for the text-only Figma frames.
3. Keep `Candidate alternatives` as optional raw material, not active page copy.
4. Refresh the Figma page `04 Text Structure` from this file after copy stabilizes.
5. Use the text-only Figma frames to validate hierarchy and section order.
6. Apply the visual design system only after the plain text version reads well.
7. Implement code from the approved Figma frames, not directly from loose alternatives.

Decision rule:

If copy is not intended for the next Figma refresh, keep it under a `Candidate alternatives` or `Story sources` heading.

## Voice

EweserDB should sound direct, defiant, and practical.

Rules:

- Headlines can be sharp.
- Body copy should be calm and concrete.
- Avoid vague future-of-data language.
- Avoid the word "paradigm." and other too broad, generic, or hyped up SaaS marketing terms.
- Avoid making Ewe Note sound like the whole product.
- Use "user-owned data" as the center of gravity.
- Use "apps", "agents", "schemas", "rooms", "permissions", and "sync" when the product needs to feel real.
- Lead from stories and concrete frustrations before broad claims.
- Talk about AI as a practical use case for user-owned context, not as generic AI hype.

## Story Sources

Use these as the strongest story examples. They are not all meant to appear on the landing page at once.

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

### Hero Headline Pool

Raw material for ads, manifesto lines, subheadlines, or future variants. Not active page copy.

- Own the database. Swap the app.
- One data layer. Every app you choose.
- The user should own the substrate.
- Own your data in spite of the cloud.
- New apps. Same data. No starting over.
- Break out of the walled garden.
- Every walled garden has a gate. Yours is here.

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

## Named Call-Out Strategy

Use named or name-adjacent products when they make a story more recognizable. Do not make the landing page a list of grievances against specific companies.

Good patterns:

- "If you've ever trusted tools like Evernote..."
- "Duolingo-style learning apps are great at streaks, less great at portable learning history."
- "Leaving a large ecosystem should not mean rebuilding your digital life piece by piece."
- "Some people want an Obsidian-scale knowledge base. Others just want simple notes, local sync, and reviewable AI access."

Avoid:

- "Evernote loses your notes."
- "Duolingo traps your data."
- "Google steals your life."
- "Obsidian is bloated."

## Landing Page

### 1. Header

Status:

Current copy

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

Notes:

- Primary action links to a public /connected-tools page listing available apps and MCP access.
- From that page: Ewe Note links go directly to the app (no signup required). MCP setup requires sign-in.
- Ewe Note should be presented as a proof point or demo, not as the product itself.
- Header labels should stay short and system-like.

### 2. Hero

Status:

Current copy

Kicker:

Local-first database for user-owned software

Primary headline:

Your data. Not their moat.

Body:

EweserDB is a local-first database for apps that refuse lock-in. Your notes, learning work, documents, agents, and collaborative tools can all work from the same user-owned data layer.

Primary CTA:

Explore the ecosystem

Secondary CTA:

Build with EweserDB

Hero diagram labels:

- User auth
- Trust and access
- EweserDB core
- User-owned data authority
- Personal data
- Collections and rooms
- Connected apps
- Scoped app grants
- MCP access
- Agent permissions
- Publishing
- Reuse the same data

Hero diagram note:

The diagram should make one thing obvious: apps and agents orbit the user's data layer; they do not own it.

### 3. Problem

Status:

Current copy

Section label:

01 // The Problem

Headline:

Apps became landlords.

Body:

Modern software treats your notes, documents, decisions, relationships, and learning work like platform property. You spend years building context, then a bug, shutdown, bad export, or bloated product roadmap can put that work out of reach.

Old world panel:

Title:

Old world

Items:

- The app owns the database.
- Your context stays trapped in one product.
- Collaboration requires everyone to use the same platform.
- Agents only help if you copy your life into them.
- Trying something new means starting from zero.
- Export is an escape hatch, not a workflow.

EweserDB world panel:

Title:

EweserDB world

Items:

- You own the database.
- Apps compete on experience, not captivity.
- Collaboration can happen over shared user-owned data.
- Agents get scoped, reviewable access.
- New apps can begin with the user's existing data.
- The cloud can sync without becoming the owner.

Pull quote:

Own the substrate. Swap the interface.

### 4. Model Shift

Status:

Current copy

Section label:

02 // The Reversal

Headline:

Switch apps. Keep your work.

Candidate alternatives:

- The database belongs to the user.
- New app. Same data.
- The app can change. The data stays.

Body:

EweserDB separates the data layer from the app layer. Your rooms, documents, schemas, permissions, and sync state live in a user-owned system. Apps connect to that system when you allow them, then compete on what they help you do.

Comparison labels:

- App-owned data
- User-owned data

App-owned data:

- Notes app owns notes
- Study app owns flashcards
- Publishing app owns posts
- AI tool owns context
- Every new tool starts empty
- Features pile up because one app must satisfy everyone

User-owned data:

- One personal data layer
- Many compatible interfaces
- Scoped access for apps and agents
- Shared schemas for interop
- New tools can start useful on day one
- Lightweight apps can serve specific workflows

### 5. Ecosystem Use Cases

Status:

Current copy

Section label:

03 // Ecosystem

Headline:

One sheep. All your data. With you anywhere.

Note:

A sheep illustration or mascot image should appear near this headline to anchor the brand reference for first-time visitors.

Body:

Notes are one proof point. The bigger story is a user-owned data layer that can feed focused apps, agents, publishing, collaboration, study tools, and personal knowledge workflows.

Cards:

AI + MCP

Controlled access for agents. Let AI tools work from your notes, documents, and context without handing one provider the whole data layer.

Collaborative notes

Shared rooms, offline-first editing, and conflict-free sync across devices.

Knowledge base

Linked records, notes, references, and documents that other apps can understand.

Study tools

Turn the same notes into flashcards, quizzes, summaries, and review flows without exporting your work into another silo.

Publishing

Reuse the same data across websites, docs, newsletters, and knowledge portals.

Team memory

Share decisions and context without forcing the team into one permanent interface.

Micro apps

Build small, focused interfaces for specific workflows without making each app own the user's whole world.

Personal sharing

Future-facing: share rooms, files, photos, and family context through user-controlled permissions instead of platform captivity.

### 6. Connected Tools

Status:

Current copy

Section label:

04 // Connected Tools

Headline:

Apps connect. You stay in control.

Body:

See every connection, scope, and grant in one place. Approve access, revoke it, and know exactly what each app can touch.

Connected tool cards:

User-owned auth

Sign in, approve scopes, manage account trust, and keep app access visible.

Personal data

See collections, schemas, rooms, sync state, storage, sharing, and recovery.

Connected apps

Review installed apps, granted scopes, recent access, and revoke controls.

MCP / AI access

Connect AI clients through scoped grants, setup flows, and audit-style visibility.

Future storage

Connect file storage providers for photos, attachments, and larger blobs while keeping EweserDB focused on sync, permissions, metadata, and app interop.

### 7. Developer Section

Status:

Current copy

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

### 8. Final CTA

Status:

Current copy

Headline:

Better tools without starting over.

Body:

Try the demo, read the docs, or deploy your own user-owned stack.

Primary CTA:

Try Ewe Note

Secondary CTAs:

- Read the docs
- Self-host it

Footer phrase:

"Ewe-ser", pronounced "user". Because you are.

## Core Product Pages

### Personal Data Home

Purpose:

Give the user a calm home for the data layer they own.

Primary headline:

The database you own.

Body:

Manage the collections, rooms, schemas, storage, recovery, and sync state that connected apps use.

Primary blocks:

- Storage and sync status
- Collections
- Rooms
- Schemas
- Sharing
- Recovery
- Connected apps summary
- MCP grants summary

Metric labels:

- Collections
- Rooms
- Connected apps
- Agent grants
- Local storage
- Last sync

Collection row copy examples:

Notes

Shared notes, documents, links, and working context.

Tasks

Action items and project state that multiple tools can read.

References

Sources, files, bookmarks, citations, and reusable knowledge.

### Connected Apps

Purpose:

Make app access visible, understandable, and revocable.

Primary headline:

Every app asks first.

Body:

Review which apps can access your data, what scopes they have, when they last connected, and what you want to revoke.

Primary blocks:

- Installed apps
- Pending requests
- Recent access
- Scope inspector
- Revoke/downgrade actions

App row labels:

- App
- Domain
- Scopes
- Collections
- Last access
- Status

Scope labels:

- Read
- Read/write
- Collections
- Rooms
- Metadata
- Sharing

### MCP / AI Access

Purpose:

Make AI access feel powerful but bounded.

Primary headline:

You choose what AI can see.

Body:

Connect AI clients through scoped access. Choose what they can read, what they can write, and which collections they can touch.

Note — Obsidian MCP differentiation:

Obsidian is the main notes MCP competitor. Differentiate on: no local vault required, no plugin setup complexity, multi-device sync included, room-level permission scoping, and access visible and revocable from one place.

Primary blocks:

- Client setup
- Active grants
- Permission scopes
- Audit-style activity
- Token rotation / reconnect

Client labels:

- Claude
- ChatGPT
- Local client
- Custom MCP client

Safety copy:

Never place bearer tokens in URLs. Setup flows stay on authenticated Eweser pages and mint or rotate tokens server-side.

### Auth / Account Trust

Purpose:

Make authentication feel like entry into a user-owned control plane, not a generic login wall.

Primary headline:

Sign in to your data layer.

Body:

Use one Eweser identity to approve app access, manage rooms, and connect tools to the data you own.

Primary blocks:

- Sign in
- Create account
- App requesting access
- Requested scopes
- Trust and security notes

Permission prompt headline:

Grant access to your data layer.

Permission prompt body:

Review the app, domain, requested collections, and scope before approving access.

## Figma Sync

Goal:

Create a deliberately plain Figma frame that tests hierarchy only.

Status:

Created in the primary Figma file on page `04 Text Structure` (`2218:2`).

Current frames:

- `Landing / Text Structure / Desktop 1440` (`2218:3`)
- `Landing / Text Structure / Mobile 390` (`2218:79`)
- `Data Home / Text Structure / Desktop 1440` (`2218:155`)
- `Connected Apps / Text Structure / Desktop 1440` (`2218:170`)
- `MCP Access / Text Structure / Desktop 1440` (`2218:185`)
- `Auth / Text Structure / Desktop 1440` (`2218:200`)

Next sync:

- Refresh these frames after the `Current copy` sections are approved.
- Do not sync `Candidate alternatives` unless one is promoted to current copy.

Rules for text-only frames:

- Use boxes and text only.
- No final colors beyond grayscale plus one accent.
- No decorative hero art.
- No complex shadows.
- No custom illustration.
- Each section must show headline, body, CTAs, cards, and labels.

Acceptance criteria:

- The landing page reads coherently without visual styling.
- Connected tools and product pages have clear labels and actions.
- The design system work can proceed with confidence that the words are not fighting the layout.
