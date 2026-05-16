# EweserDB: Core Copy Deck

Voice direction and headline reference for EweserDB copy and design passes.
Full page copy: `2026-04-27-full-text-page-copy.md`
Product rationale and decisions: `2026-04-27-product-decisions.md`

---

## Voice

EweserDB should sound direct, defiant, and practical — with a manifesto undercurrent.

Current direction: **Communist/liberation manifesto**. The aesthetic is Soviet/Maoist propaganda poster energy — bold proclamations, "for the people", "seize", "liberation", "the front" — not specific Communist Manifesto text quotes which most readers won't recognise. Section markers use `§ I //`, `§ II //` style. Panels use "The old regime" / "The liberated stack" framing. Pull quotes have manifesto weight. The rhetoric stays anchored to data ownership, not labour politics.

The sheep icon enables "Ewe/you" puns. Use them when natural — not on every line. Best placements: hero area, bullet lists ("Ewe own the database."), footer tagline, dev section ("Ewe hold the keys.").

Rules:

- Headlines can be sharp and declarative, bordering on manifesto proclamations.
- Body copy stays calm and concrete — the contrast with bold headlines is intentional.
- Avoid vague future-of-data language.
- Avoid the word "paradigm" and other bloated SaaS terms.
- Avoid making Ewe Note sound like the whole product.
- Use "user-owned data" as the center of gravity.
- Use "apps", "agents", "schemas", "rooms", "permissions", and "sync" when the product needs to feel real.
- Lead from stories and concrete frustrations before broad claims.
- Talk about AI as a practical use case for user-owned context, not as generic AI hype.
- Keep the manifesto tone fun and pointed — not paranoid or abrasive.

### Hero Headline Pool

Raw material for ads, manifesto lines, subheadlines, or future variants. Not active page copy.

Manifesto direction (current active theme):

- Seize the data layer. _(active hero headline)_
- Your data. Not their property. _(active hero kicker — replaces "Workers of the web")_
- Own the substrate. Swap the interface. _(active pull quote — replaces the Manifesto text riff)_
- The revolution is self-hostable. _(active final CTA headline)_
- Build for the people. Not the platform. _(active developer headline)_
- A spectre is haunting software. _(active problem headline)_
- The database belongs to the people.
- The means of data production belong to the user.
- Data liberation front.
- No more being fleeced by platforms.
- Ewe are the user. Ewe own the database.
- The people's data layer.
- Join the front.
- "Ewe-ser", pronounced "user". Workers of the web: ewe are the user. _(active footer)_
- Ewe hold the keys.

Cut lines (do not reuse):

- ~~Workers of the web, unite.~~ — pulls toward labour politics, implies only office workers; misses the data ownership theme.
- ~~The history of all software is the history of data capture.~~ — riff on the Communist Manifesto's opening line, but only lands if you know the exact quote. Most people know the Soviet/Maoist aesthetic, not the text. Lost on most readers.

Alternate / evergreen pool:

- Own the database. Swap the app.
- One data layer. Every app you choose.
- The user should own the substrate.
- Own your data in spite of the cloud.
- New apps. Same data. No starting over.
- Break out of the walled garden.
- Every walled garden has a gate. Yours is here.

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
