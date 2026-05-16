## Goal

Define the next landing page narrative for EweserDB so brand, Figma, and implementation all point at the same product story.

This pass moves the site away from "notes app with a database underneath" and toward "user-owned data infrastructure with an ecosystem of apps, agents, and interfaces."

## Scope

In:

- Landing page message hierarchy
- Section-by-section story structure
- Recommended hero directions
- Product surface previews to include on the page
- Figma-ready content brief for the next design pass

Out:

- Exact visual styling decisions
- Full screen specs for authenticated app pages
- Implementation details for Astro components

## Product Positioning

### Core idea

EweserDB is a local-first, interoperable database that users own and apps connect to.

### Strategic shift

The landing page should stop centering Ewe Note as the product.

Ewe Note remains an important proof point, but the product story should emphasize:

- One personal data layer
- Many compatible apps
- AI and MCP access on user terms
- Collaboration without platform captivity
- Developer tooling for building on shared schemas

### Message spine

Primary:

- Your data is not their moat.

Supporting:

- Own the substrate. Swap the interface.
- Apps should compete on experience, not captivity.
- One database. Many apps. User-owned by default.

## Audience Order

The page should speak to audiences in this order:

1. Curious user or builder who feels the pain of lock-in
2. Technical product user who wants practical use cases
3. Developer evaluating whether this is real infrastructure

This means the page should open with a clear point of view, then show useful outcomes, then earn technical trust.

## Narrative Principles

- Lead with the bigger model, not the example app.
- Use defiant language in headlines, then calm clarity in body copy.
- Show useful workflows, not abstract "future of data" claims.
- Preview the real product surfaces so the landing page feels connected to the app.
- Treat notes as one app in a larger ecosystem.

## Recommended Landing Page Structure

### 1. Hero

Purpose:
Establish that EweserDB is user-owned data infrastructure, not just another notes tool.

Recommended headline options:

- Your data. Not their moat.
- Own your data. In spite of the cloud.
- One database. Every app you choose.

Recommended hero copy:

EweserDB is a local-first interoperable database for apps that refuse lock-in. Notes, agents, study tools, publishing workflows, and collaborative workspaces can all connect to the same user-owned data.

Primary CTA:

- Explore the ecosystem

Secondary CTA:

- Build with EweserDB

Hero visual:

- A shared personal data core connected to multiple app surfaces
- Show at least four visible surfaces:
  - Notes
  - Personal data manager
  - Connected apps
  - MCP / AI access

Important note:

- The visual should make the ecosystem feel larger than a single notes app.
- The first viewport should already hint at real app UI, not only abstract diagrams.

### 2. Problem Section

Purpose:
Name the enemy plainly: app silos and corporate ownership of user context.

Recommended heading:

- Apps became landlords.

Body direction:

Modern software treats your notes, decisions, documents, and knowledge like platform property. Switching tools means rebuilding context, collaboration means joining the same silo, and AI only works when your data is trapped somewhere it can reach.

Pain points:

- Your work gets trapped in product-specific databases
- Switching tools means rebuilding your context from scratch
- Collaboration requires everyone to use the same platform
- AI agents cannot help unless your data is accessible

### 3. Model Shift Section

Purpose:
Show the conceptual reversal in one fast comparison.

Recommended heading:

- Own the substrate. Swap the interface.

Comparison:

Old world:

- The app owns the database.
- You rent the interface.

EweserDB world:

- You own the database.
- Apps compete to serve you.

Design note:

- This should be one of the cleanest sections on the page.
- It is the shortest route to understanding the product.

### 4. Use Cases Section

Purpose:
Translate the philosophy into practical reasons to care.

Recommended heading:

- A bigger playground for your data.

Recommended cards:

- AI + MCP access
  - Give agents controlled access to your data without copy-pasting your life into chat windows.
- Collaborative notes
  - Work together in real time with offline-first sync and conflict-free merging.
- Obsidian-style knowledge base
  - Keep structured notes, links, and documents in a system other apps can understand.
- Study tools
  - Turn notes into flashcards, summaries, or spaced repetition workflows without export gymnastics.
- Publishing
  - Reuse the same data across sites, docs, newsletters, or knowledge portals.
- Team memory
  - Share decisions, references, and working knowledge without locking the team into one interface forever.

### 5. Product Surface Preview

Purpose:
Bridge the marketing page to the actual product and set up the next design phase.

Recommended heading:

- One data layer. Real control surfaces.

Preview modules to show:

- User-owned auth
  - Sign in, approve access, manage account trust
- Personal data manager
  - Collections, schemas, rooms, sync state, storage, and sharing
- Connected apps
  - Installed apps, permissions, recent access, revoke controls
- MCP / AI connections
  - Client setup, scopes, grants, audit-style visibility

Why this matters:

- These previews make the product feel tangible
- They create continuity for the upcoming app-like UI work
- They keep the landing page from reading like manifesto-only marketing

### 6. Developer Section

Purpose:
Convert skeptical builders by showing the platform is technically serious.

Recommended heading:

- Build the app. Not the enclosure.

Core copy direction:

EweserDB gives developers a local-first database, sync layer, shared schemas, and MCP-ready access patterns so they can build better tools without inventing another proprietary island.

Proof points:

- TypeScript SDK
- Yjs CRDT foundation
- Offline-first local storage
- Real-time sync
- Shared schemas across apps
- MCP-ready access
- Self-hostable infrastructure
- MIT open source

### 7. Closing CTA

Purpose:
Give both users and developers a next step without collapsing back into "just try the notes app."

Recommended headline:

- Better tools should not require starting over.

Primary CTA:

- Try the demo

Secondary CTA:

- Read the docs

Optional tertiary links:

- View GitHub
- Self-host it

## Copy Guidance

### Tone

- Defiant in headlines
- Plainspoken in body copy
- Technical when proving credibility
- Never vague, floaty, or utopian

### Do

- Say "user-owned," "local-first," "interoperable," and "shared schemas"
- Use "apps" more often than "notes"
- Show concrete workflows involving agents, publishing, collaboration, and app switching

### Avoid

- Overexplaining CRDTs before the reader cares
- Framing Ewe Note as the whole product
- Generic SaaS language like "streamline your workflow"
- Abstract "future of work" filler

## Figma Execution Brief

Use this brief for the next landing-page design pass in Figma or Stitch:

Design a responsive landing page for EweserDB, a local-first interoperable database for user-owned apps.

The page should feel sharp, rebellious, credible, and technically serious. It should argue against corporate data lock-in while still looking polished enough for developers to trust. Avoid generic SaaS layouts, soft gradients, or abstract blob visuals.

The page must make the ecosystem feel larger than a notes app. Notes can appear as one example, but the hero and preview sections should also show user-owned auth, personal data management, connected apps, and MCP or AI access.

Required sections:

- Hero
- Problem
- Model shift
- Use cases
- Product surface preview
- Developer section
- Final CTA

Visual direction:

- High-contrast dark editorial-tech base
- Strong typography
- Grid, schema, and node motifs
- App surfaces and data relationships
- Accent colors can be acid green, electric cyan, or warning red used sparingly

## Next Design Deliverables

After the landing page story is approved, the next screens to design should be:

1. Personal data home
2. Connected apps and permissions
3. MCP and AI connections
4. Login and auth flow

That order keeps the product model visible before dropping into entry screens.
