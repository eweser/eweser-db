# Phase 4: Deploy & Polish

> **Plan:** [Big Refactor Index](./2026-04-02-big-refactor.md)
> **Prerequisite:** Phases 1–3 complete
> **Goal:** Production readiness, static landing pages for SEO, documentation rewrite, code cleanup.

Hard-cutover assumption: deployment and docs target only the post-migration stack, with no legacy runtime compatibility guarantees.

## Progress

- [ ] Run 4.1 — Production Docker Compose
- [ ] Run 4.2 — Clean up old code
- [ ] Run 4.3 — Update all documentation
- [ ] Run 4.4 — SEO static landing pages
- [ ] Run 4.5 — One-click deploy templates (aspirational)

## Agent Scratchpad

> Use this section to track decisions, blockers, and notes during implementation.

---

## Run 4.1: Production Docker Compose

**What:** Create a production-ready `docker-compose.prod.yml` with:

- Proper health checks on all services
- Resource limits
- Restart policies
- Volume management for persistence
- Environment variable documentation
- SSL via Caddy auto-HTTPS

**Files:**

- Create `docker-compose.prod.yml`
- Update `.env.example` with all production vars
- Create `docs/deployment.md` — deployment guide

**Done when:** `docker compose -f docker-compose.prod.yml up -d` runs a production stack with HTTPS.

---

## Run 4.2: Clean up old code

**What:** Remove old-code directory and deprecated Next.js auth-server.

**Files:**

- Delete `old-code/` (after confirming all reusable code has been ported)
- Delete `packages/auth-server/` (the Next.js version)
- Update `package.json` workspaces
- Update CI/CD workflows

**Done when:** Monorepo only contains active packages. CI passes.

**Risks:** Run immediately after Phase 1-3 verification, before docs freeze, so docs only describe the final stack.

---

## Run 4.3: Update all documentation

**Recommended Agent:** `documenter` (Fast)
**Reason:** Documentation updates are best handled by a fast model.

**What:** Update docs to reflect the new architecture post-migration.

**Files:**

- Rewrite `ARCHITECTURE.md` — remove "migration" framing, document the final state
- Rewrite `LOCAL_DEVELOPMENT.md` — Docker Compose-based setup (much simpler)
- Update `README.md` — new getting started with Docker Compose
- Update `packages/*/README.md` — each package's new role
- Update `.github/copilot-instructions.md` — remove migration notes

**Done when:** A new developer can set up the project from the docs using only `docker compose up`.

---

## Run 4.4: SEO — Static landing pages

**What:** Create static landing pages served by Caddy for SEO. The apps themselves remain SPAs.

**Approach:** Simple static HTML/CSS landing pages (can be generated from markdown with a simple build step, or handwritten). Caddy serves these at the root while the SPA loads at `/app/`.

**Files:**

- Create `packages/landing/` — static HTML landing pages
  - `index.html` — main landing page (what is EweserDB, features, get started)
  - `docs/` — static docs pages
- Update Caddyfile to serve landing at `/` and SPA at `/app/`

**Done when:** Search engines can crawl the landing page. SPA loads at `/app/`.

---

## Run 4.5: One-click deploy templates (aspirational)

**What:** Create deploy templates for DigitalOcean App Platform, Railway, etc.

**Files:**

- Create `deploy/digitalocean/` — App Spec YAML
- Create `deploy/railway/` — railway.json
- Document in `docs/deployment.md`

**Done when:** One-click deploy works on at least one cloud provider.

_Note: This run is aspirational and can be deferred._

## Execution Summary

```text
Run 4.1: Production Docker Compose (Smart)
└── Run 4.2: Clean up old code (Fast)
  ├── Run 4.3: Update Documentation (Fast)
  └── Run 4.4: SEO Landing Pages (Fast) [Parallel with 4.3]
    └── Run 4.5: One-click deploy templates (Fast, aspirational)
```

## Status

- [ ] Approved by user
