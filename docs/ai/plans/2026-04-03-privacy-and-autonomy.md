# Plan: Privacy & Autonomy — "Protect by Architecture, Guarantee by Policy"

> **Created:** 2026-04-03
> **Status:** Draft — awaiting approval

## Goal

Make the privacy guarantees of EweserDB technically credible, legally honest, and UX-visible — so that using eweser.com's hosted service feels genuinely private, while self-hosting remains the gold standard for full autonomy.

## The Core Insight

The strongest privacy claim in EweserDB isn't on the server — it's already in the architecture:

> **Local-first means your primary data copy is always on your device.** The sync server (whether eweser.com or self-hosted) is a relay for multi-device sync and backup, not the source of truth. Even if eweser.com disappears tomorrow, all your notes are intact in your browser.

This is genuine and differentiating. No cloud alternative (Notion, Firebase, Apple Notes) can make this claim. Lead with it.

But "local-first" alone isn't enough when users deposit personal knowledge, AI conversations, and bookmarks into eweser.com. We need concrete technical protections and honest, verifiable commitments on top.

---

## Trust Model by Hosting Mode

| Mode                                | Who sees your data?       | Privacy class | Effort for user         |
| ----------------------------------- | ------------------------- | ------------: | ----------------------- |
| **Fully offline** (no sync)         | Nobody                    |       Highest | Zero — works by default |
| **Self-hosted** (your Docker)       | Only you                  |     Very high | `docker compose up`     |
| **Third-party server** (friend/org) | Server admin              |        Medium | Share sync URL          |
| **eweser.com Cloud**                | eweser.com (policy-bound) |          Good | Sign up, zero config    |

The goal: make the top two rows the default for power users; make the bottom row genuinely trustworthy for everyone else.

---

## Privacy Guarantees — What eweser.com Can Honestly Claim

### Architectural guarantees (always true regardless of policy)

These derive from the system design. They are verifiable by reading the open-source code:

1. **Local-first** — data lives in your browser's IndexedDB first. The server only ever receives Yjs update deltas, not full document read requests. Your data exists independently of eweser.com
2. **Open-source verifiable** — both the sync server and auth server are open source. Anyone can audit what the server actually does with your data. "Trust us" backed by "here's the code"
3. **Open data format** — data is stored as Yjs CRDTs with typed schemas. No proprietary format. Export → import to any compatible system at any time
4. **No vendor lock-in** — switching from eweser.com to self-hosted is a config change (one environment variable: `SYNC_URL`). Migration tooling will automate it

### Technical protections on eweser.com

5. **Encrypted in transit** — TLS 1.3 for all connections (WebSocket + HTTPS)
6. **Encrypted at rest** — PostgreSQL data encrypted at the disk level (standard cloud provider feature). Sync server SQLite also encrypted at rest
7. **Minimal metadata** — server logs contain only: timestamp, room ID (UUID), bytes transferred. No content. No IP beyond rate-limiting (scrubbed after 24hr)
8. **Account deletion is real** — deleting your account hard-deletes all rooms, documents, and user records from PostgreSQL and the sync server. Not soft-delete. Verifiable via open-source migration scripts
9. **Data export on demand** — full JSON export of all your rooms and documents, downloadable from account settings at any time with no restriction

### Policy commitments (legal + ethical)

10. **We do not read your data** — no employee or automated system reads document content for any purpose
11. **We do not sell or share your data** — never. Not to AI companies. Not to advertisers. Not to anyone
12. **We do not train models on your data** — AI is part of our ecosystem but we will never use your data to train or fine-tune any model
13. **Transparency report** — we publish all legal requests received. Like Signal, we will fight orders that we believe are overbroad and notify users when legally permitted
14. **GDPR + CCPA baseline for everyone** — right to access, right to delete, right to portability for all users globally, not just EU/CA

### The honest limitation

eweser.com cannot currently claim **end-to-end encryption (E2EE).** That would mean the server sees only encrypted blobs and cannot decrypt them under any circumstances. True E2EE would:

- Make real-time CRDT collaboration between multiple users technically impossible without a shared key exchange (solvable but complex)
- Make server-side search and aggregation impossible
- Make account recovery impossible (losing your key = losing your data)

**The honest statement:** "We protect your privacy by architecture, policy, and technical controls. We cannot read your data without significant effort, and we commit never to try. For absolute cryptographic privacy, self-host."

---

## Optional Room-Level E2EE (Phase 2)

For users who need cryptographic guarantees for specific sensitive rooms (health, finance, private journal):

- User generates or passcode-derives a symmetric key stored only in-browser
- Room data encrypted client-side before any Yjs update is sent to the server
- Server stores and relays opaque encrypted blobs
- **Trade-offs:** No real-time collaboration on that room (can only sync between your own devices sharing the key). No server-side search. No backup recovery if key lost
- Best for: single-user personal rooms. Not for shared/collaborative rooms

This is explicitly a Phase 2 feature, not launch. Architecturally sound, operationally complex.

---

## Self-Hosting: Make It Genuinely Easy

The self-hosting story is the ultimate autonomy guarantee. It must be real, not aspirational.

### Current state

- `docker compose up` works (Phase 1-3 complete)
- `.env.example` documents all variables
- Dev stack verified running

### What's still needed

#### Run P1: One-Click Cloud Deploys

**Goal:** Self-hosting shouldn't require `ssh` knowledge.

- [x] **DigitalOcean — "Deploy to DigitalOcean" button** — generates a Droplet with Docker Compose pre-configured. Most popular VPS for self-hosters
- [x] **Railway deploy button** — for developers who prefer managed containers
- [ ] **Render deploy button** — similar to Railway, popular with devs (skipped — render.yaml not yet created; low priority vs. DO + Railway coverage)
- [x] **Minimum spec documentation** — "runs on a $6/month VPS with 512MB RAM, 1 vCPU, 10GB disk"
- [x] **`docker-compose.prod.yml`** — hardened production compose: health checks, restart policies, resource limits, volume management

**Files created:**

- `docs/deployment/digital-ocean.md` ✅
- `docs/deployment/railway.md` ✅
- `docs/deployment/minimum-specs.md` ✅
- Deploy button badges in `README.md` ✅
- `.do/app.yaml` (DigitalOcean App Platform spec) ✅
- `docker-compose.prod.yml` ✅

**Done:** ✅ P1 complete (2026-04-03)

---

#### Run P2: Migration Tooling (eweser.com → Self-Hosted)

**Goal:** Switching servers should feel like changing a DNS record, not a migration project.

- [x] **Export from eweser.com** — `scripts/migrate-export.ts` — full data export in JSON (user-initiated, CLI tool)
- [x] **Import to self-hosted** — `scripts/migrate-import.ts` — import script accepts the JSON export, writes all rooms/documents to the new instance
- [x] **Live migration mode** — verified: existing IndexedDB data syncs up to the new server automatically (local-first architecture handles this via changing `SYNC_URL` config)
- [ ] **Account settings page** — "Change sync server" field. Updates `SYNC_URL` config and reconnects — **deferred to auth-pages sprint**

**Files created:**

- `scripts/migrate-export.ts` ✅
- `scripts/migrate-import.ts` ✅

**Notes:**
- Both scripts support `--dry-run` mode for safe inspection before committing changes
- Export/import cover: users, rooms, access grants
- Live migration (changing sync URL) already works architecturally without any code change — the IndexedDB holds the source of truth and syncs to whichever Hocuspocus URL is configured

**Done:** ✅ P2 complete (2026-04-03) — account settings UI deferred

---

#### Run P3: Agent Permission System (AI Privacy Layer)

The MCP server dramatically increases the privacy surface. AI agents that can read all your notes need a proper permission model.

- [x] **Agent registry in EweserDB** — `AgentConfig` and `AgentAccessLogEntry` schemas added to `@eweser/shared`
- [x] **Per-room permissions** — each agent config specifies: which collections (e.g., `notes`, `bookmarks`), which rooms (all / specific UUIDs), read-only or read-write
- [x] **Revocable agent tokens** — short-lived tokens (SHA-256 hashed in DB). Revoking sets `isActive=false`, immediately blocks `verify-token`. Token rotation supported.
- [x] **Agent access audit log** — `agent_access_logs` table with Drizzle migration. `logAgentAccess()` model function ready for MCP server to call.
- [x] **Agent management API** — full CRUD in `packages/auth-server-hono/src/routes/agents.ts`:
  - `GET /api/agents` — list agents (no token hash returned)
  - `POST /api/agents` — register agent, returns plaintext token once
  - `GET /api/agents/:id` — get agent
  - `POST /api/agents/:id/revoke` — revoke immediately
  - `POST /api/agents/:id/rotate-token` — generate new token
  - `DELETE /api/agents/:id` — delete permanently
  - `GET /api/agents/:id/logs` — access logs
  - `POST /api/agents/verify-token` — MCP server calls this to validate Bearer tokens
- [ ] **"What does this agent know?" view** in `auth-pages` — **deferred to auth-pages sprint**
- [ ] **MCP server respects permissions** — **blocked on MCP server creation (Run 3 of AI-First plan)**

**Files created:**

- `packages/shared/src/collections/agent-config.ts` ✅ + changeset
- `packages/shared/src/collections/index.ts` updated ✅
- `packages/auth-server-hono/src/db/schema/agents.ts` ✅
- `packages/auth-server-hono/src/db/schema/index.ts` updated ✅
- `packages/auth-server-hono/drizzle/0002_agents.sql` ✅ + journal updated
- `packages/auth-server-hono/src/model/agents.ts` ✅
- `packages/auth-server-hono/src/routes/agents.ts` ✅
- `packages/auth-server-hono/src/routes/agents.test.ts` (21 tests, all passing) ✅
- `packages/auth-server-hono/src/index.ts` updated ✅

**Done:** ✅ P3 backend complete (2026-04-03) — UI and MCP integration deferred to later runs

---

## Privacy-First UX Principles

These apply across all apps and the account settings:

1. **Privacy mode by default for new rooms** — new rooms are `private` (sync only to your own devices). Sharing/collaboration is an explicit opt-in, not the default
2. **Sync status is always visible** — users can see at a glance whether a room is local-only, syncing to eweser.com, syncing to a custom server, or E2EE (future)
3. **No tracking scripts** — no Google Analytics, no Segment, no Sentry (use self-hosted error reporting or server-side only). The apps never phone home to third parties
4. **No CDN for app code** — all JavaScript served from the same origin as the app. No third-party CDN that could be compromised
5. **CSP headers** — strict Content Security Policy enforced by Caddy to prevent XSS
6. **Dependency minimalism** — fewer npm packages = smaller attack surface. Audit the bundle
7. **Password handling** — better-auth uses bcrypt (this is built-in). Document explicitly. Never log passwords

---

## Marketing: How to Say This

### Don't say

- "Your data is completely private" (not technically precise if using hosted service)
- "We can't read your data" (we can, we just choose not to and have technical barriers)
- "End-to-end encrypted" (not true for hosted service at launch)

### Do say

- "Your data lives on your device first. eweser.com is a relay, not a keeper."
- "Local-first means offline-first means you-first."
- "We're open source. Our privacy promises are verifiable."
- "Self-host with one command. Zero vendor lock-in."
- "We don't read, sell, or train on your data. Ever."
- "Delete your account, delete your data. For real."

### The honest hosting comparison

| Claim                     | Apple Notes    | Notion       | eweser.com     | Self-Hosted EweserDB |
| ------------------------- | -------------- | ------------ | -------------- | -------------------- |
| Data on your device       | ✅ (if iCloud) | ❌           | ✅ Always      | ✅ Always            |
| You can verify our claims | ❌             | ❌           | ✅ Open source | ✅ You run it        |
| We can read your data     | ✅             | ✅           | Policy: No     | No — you run it      |
| Can train AI on your data | ✅             | ✅           | No — committed | No                   |
| Export your data          | Limited        | ✅ (limited) | ✅ Full JSON   | ✅ Full JSON         |
| Switch providers          | Hard           | Hard         | One config var | N/A                  |
| True no-vendor lock-in    | ❌             | ❌           | ✅             | ✅                   |

---

## Risks

1. **E2EE expectations** — Privacy-aware users may expect E2EE as a baseline. Be upfront about the limitation and the roadmap. Don't oversell
2. **Legal requests** — as a US-based project, you're subject to US law. A transparency report doesn't protect you from a valid warrant. Be honest about this: "We protect your privacy by not having encryption keys that could be compelled." Until E2EE lands, self-hosting is the answer for adversarial threat models
3. **Agent tokens and MCP security** — the MCP server is a significant attack surface. A compromised agent config or leaked token could expose data. Mitigation: short-lived tokens (expires in X hours), scoped permissions, revocation audit log. Treat agent tokens with same care as OAuth tokens
4. **Dependency supply chain** — the npm ecosystem has had supply chain attacks. `audit` in CI, pin critical dependencies, prefer small/audited packages
5. **GDPR compliance cost** — handling data subject requests manually is time-consuming. Automate: account deletion API, export API, DPA template. Invest in this before users are in the EU

---

## Execution Summary

These runs slot into the existing AI-First Launch Strategy plan.

```text
[Parallel with Run 1 & 2 from AI-First plan]
Run P1: One-click cloud deploys (Fast) — 2-3 days
Run P2: Migration tooling (Fast) — 2-3 days
Run P3: Agent permission system (Smart) — 1 week [gates MCP server launch]

[Before launch]
Policy work: Privacy policy, ToS, transparency report commitment — 1-2 days (AI-drafted, human-reviewed)
```

Run P3 is a **gate for the MCP server launch.** Do not launch the MCP server publicly without the agent permission system. An MCP server with no permissions is a full data-access token with no revocation — that's unacceptable.

---

## Status

- [x] Approved by user
- [x] Run P1: One-Click Cloud Deploys — **COMPLETE** (2026-04-03)
- [x] Run P2: Migration Tooling — **COMPLETE** (2026-04-03)
- [x] Run P3: Agent Permission System (backend) — **COMPLETE** (2026-04-03)
  - Deferred: auth-pages UI for agent management
  - Deferred: MCP server permission enforcement (blocked on MCP server creation)
