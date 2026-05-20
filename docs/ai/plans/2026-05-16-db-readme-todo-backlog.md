# Plan: DB README TODO Backlog

<!-- eweser-orchestration -->

```yaml
orchestration:
  enabled: true
  maxParallel: 1
  baseBranch: db-readme-todo-backlog
  finalStages: []
runs:
  - id: run-1
    title: Public Aggregation Permission Gate
    agent: eweser-coder
    model: strong
    ui: true
    browserCheckpoint: none
    dependsOn: []
    writeScope:
      - packages/auth-server-hono/src/**
      - packages/sync-server/src/**
      - packages/aggregator/src/**
      - packages/app/src/**
      - examples/example-aggregator/src/**
      - packages/aggregator/README.md
      - docs/ai/plans/2026-05-16-db-readme-todo-backlog.md
    tests:
      - npm test --workspace @eweser/aggregator
      - npm test --workspace @eweser/auth-server-hono
      - npm run type-check --workspace @eweser/sync-server
    changeset: no
  - id: run-2
    title: Storage Provider Profiles And Durable File Cache
    agent: eweser-coder
    model: strong
    ui: true
    browserCheckpoint: none
    dependsOn:
      - run-1
    writeScope:
      - packages/auth-server-hono/src/**
      - packages/auth-server-hono/drizzle/**
      - packages/db/src/**
      - packages/app/src/**
      - docs/deployment/**
      - .changeset/**
      - docs/ai/plans/2026-05-16-db-readme-todo-backlog.md
    tests:
      - npm test --workspace @eweser/auth-server-hono -- files
      - npm test --workspace @eweser/db -- files
      - npm run type-check --workspace @eweser/app
      - npm run build --workspace @eweser/db
    changeset: maybe
  - id: run-3
    title: User Snapshot Backups And Restore
    agent: eweser-coder
    model: strong
    ui: true
    browserCheckpoint: none
    dependsOn:
      - run-2
    writeScope:
      - packages/shared/src/**
      - packages/db/src/**
      - packages/auth-server-hono/src/**
      - packages/auth-server-hono/drizzle/**
      - packages/app/src/**
      - docs/deployment/**
      - .changeset/**
      - docs/ai/plans/2026-05-16-db-readme-todo-backlog.md
    tests:
      - npm test --workspace @eweser/db -- backup
      - npm test --workspace @eweser/auth-server-hono -- backups
    changeset: maybe
```

## Goal

Turn the stale `packages/db/README.md` TODO list into an implementation-ready backlog that finishes the remaining public-data, storage, federation, encryption, compatibility, SDK reliability, search, limits, and hosted-usage work.

## Scope

- In: public aggregation hardening, storage provider profiles, user snapshots/backups, federation, federation-as-backup, opt-in E2EE planning and implementation slices, versioning/backward compatibility, SDK cleanup/reliability, access-grant fast path, cross-collection queries, stress/size guidance, and hosted sync metering.
- In: docs and checklist updates needed to keep `packages/db/README.md`, `ARCHITECTURE.md`, package READMEs, deployment docs, and plan indexes aligned with the current architecture.
- Out: reintroducing Next.js/Supabase patterns, handling real provider credentials in committed files, choosing a paid billing provider implementation before product approval, public-launch legal tasks already tracked by `2026-04-28-compliance-and-legal.md`, and broad app-shell redesign outside the flows listed here.

## Current Findings

- The old DB README checklist mixed completed, obsolete, partial, and open work. Completed items removed from the README checklist include `newRoom`, self-hosting instructions, baseline offline-first loading, the awareness listener plumbing, and the existing two-sync-server demo shape.
- Public aggregation exists through `packages/aggregator`, Hocuspocus webhooks, and search routes, but the current webhook path does not prove that only public rooms or collections are indexed. This is the first security-sensitive backlog item.
- S3-compatible attachment upload, presign, download, SDK helpers, and `fileAttachments` metadata exist. Remaining file work is provider-profile UX/configuration, durable local cache/pinning, and production/self-hosting docs.
- Same-server room invites and app access grants exist. Federated identity, cross-server invites, server-to-server relay, and federation-as-backup are not implemented. The older federation strategy is historical context, not current guidance.
- Current docs explicitly avoid E2EE claims. Room content synced through hosted Hocuspocus is plaintext to the server. E2EE conflicts with server-side search and MCP/AI access, so it must be opt-in and explicit.
- Changesets and append-only migration policy exist, but there is no complete room schema/API compatibility strategy, data migration framework, or SDK/server version negotiation.
- SDK reliability leftovers are small but real: expired `_deleted` cleanup, auth-failure token refresh retry, online recovery/reconnect behavior, optional first-run seeded documents, and a decision on stale WebRTC temp-doc support.

## Assumptions / Open Questions

- Assumption: EweserDB is still pre-live, so clean long-term schema/API choices are preferred over preserving unused prototype data.
- Assumption: user-owned product configuration belongs in EweserDB rooms or shared schemas; auth-server PostgreSQL should hold auth, grants, provider profiles, operational tokens, usage events, and audit metadata only.
- Assumption: initial provider-profile work should support S3-compatible storage first, because the current storage adapter and Railway Buckets decision already point there. Dropbox/Pinata-style providers should be adapter-shaped but not required in the first implementation run unless explicitly approved.
- Assumption: E2EE should be opt-in per room or per base. It should not silently encrypt public/searchable/MCP-accessible data.
- Open question: Should public aggregation be controlled at room level only, or do we need collection-level public flags inside room/base metadata as well?
- Open question: Should user backups store raw Yjs update snapshots, normalized JSON exports, or both?
- Open question: Should federation use `user@server` as the canonical persisted identity immediately, or should the first run introduce federated principal records while preserving local user IDs in current ACL arrays?
- Open question: What billing provider and pricing model should be used for hosted sync limits? This plan only authorizes usage metering and limit hooks, not payment collection.

## Runs

## Run Order And Manual Test Handoffs

Run order: start with `run-1` before any public-search product claims. `run-2`, `run-4`, `run-7`, `run-9`, `run-10`, and `run-11` can be implemented concurrently in separate worktrees if their shared-package changes are coordinated. `run-3` depends on `run-2`. `run-5` depends on `run-4`. `run-6` depends on `run-4` and preferably `run-5`. `run-8` depends on `run-7`. `run-12` should happen before or alongside `run-13` so metering limits are informed by actual load data.

After each completed run, Coder must update the Execution Summary and add a manual-test handoff with:

- delivered behavior;
- local services/commands needed;
- test data/account assumptions, without secrets;
- manual steps;
- expected results;
- known gaps or residual risk.

### Run 1: Public Aggregation Permission Gate

- **Id**: `run-1`
- **Title**: `Public Aggregation Permission Gate`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Aggregator indexing is tied to explicit public room/collection state, private rooms are not indexed, and making a previously public room private removes or hides its indexed rows.
- **Files**:
  - `packages/auth-server-hono/src/routes/access-grant.ts`: add or expose a protected room-publication/update path if no current route fits.
  - `packages/auth-server-hono/src/model/rooms/calls.ts`: add auditable room public-access read/update helpers and any internal aggregator policy lookup.
  - `packages/sync-server/src/index.ts`: replace or wrap unconditional webhook forwarding with a public-policy-aware on-change path, or include enough signed room context for aggregator-side policy checks.
  - `packages/aggregator/src/webhook-handler.ts`: reject or ignore non-public webhook events and handle de-index tombstones.
  - `packages/aggregator/src/db/queries.ts`: add delete/deactivate helpers for rooms that become private or deleted.
  - `packages/aggregator/src/routes/search.ts`: ensure public routes never expose private rows and document error behavior.
  - `packages/app/src/pages.tsx` or current room settings surface: expose a minimal public/private control only if needed for manual verification.
  - `examples/example-aggregator/src/App.tsx`: update demo copy/flow to reflect explicit publication.
  - `docs/ai/plans/2026-05-16-db-readme-todo-backlog.md`: update execution status.
- **Steps**:
  - [x] Decide whether public indexing is room-level only for v1 or room plus collection metadata.
  - [x] Add a single source of truth for indexability that uses existing `publicAccess` unless a better current schema is explicitly documented.
  - [x] Ensure only room admins/owners can change publication state.
  - [x] Make sync-server webhook forwarding policy-aware, or make aggregator perform an authenticated policy lookup before upsert.
  - [x] Add de-index behavior for room deletion, public-to-private transitions, and `_deleted` documents.
  - [x] Add HMAC/signature validation coverage for webhook payloads that affect public rows.
  - [x] Update aggregator docs and example text so “public search” means explicitly published data only.
- **Tests**:
  - `npm test --workspace @eweser/aggregator`
  - `npm test --workspace @eweser/auth-server-hono`
  - `npm run type-check --workspace @eweser/sync-server`
  - Add or update route/webhook tests proving private rooms are not indexed and public-to-private removes results.
- **Verification**:
  - Start `npm run dev:docker`, create one private and one public fixture room, write documents through the SDK/example flow, and verify `/api/search` returns only public data.
- **Manual test handoff**:
  - Delivered behavior: room-level `publicAccess` is the v1 source of truth. Sync tokens now carry `publicAccess`; the sync server forwards it in webhook context; the aggregator stores `public_access`, only returns `read`/`write` rows, de-indexes private/missing-publication/tombstoned events, and strips soft-deleted child documents before indexing. A protected auth route updates room publication state only for admin users, and the aggregator demo has a per-room publish checkbox.
  - Local services/commands: run `npm run dev:docker`, then run the aggregator demo with `npm run dev --workspace @eweser/example-aggregator` or the repo's aggregator demo command if preferred. If using the local browser-signed demo token path, set `VITE_DEV_SYNC_SECRET` to the same local sync secret outside committed files.
  - Test data/account assumptions: no production data or provider credentials. Use demo-generated room IDs and seed data from `examples/example-aggregator`.
  - Manual steps: open the aggregator demo; leave Backend Beta private; publish Backend Alpha; click Seed on both panels; search for an Alpha note term and verify it appears; search for a Beta flashcard term and verify it does not appear; unpublish Backend Alpha and wait for reconnect; search the Alpha term again and verify it no longer appears.
  - Expected results: only published rooms show in `/api/search`; private rooms do not upsert and cause existing room/collection rows to be removed; deleted/tombstoned content is absent from indexed payloads.
  - Known gaps/residual risk: full Docker/browser smoke was not run in this coding pass. Public-to-private de-indexing is webhook-driven, so existing connected clients need a refreshed token/reconnect or a subsequent private webhook event; the demo toggle performs that reconnect and emits a publication marker.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 2: Storage Provider Profiles And Durable File Cache

- **Id**: `run-2`
- **Title**: `Storage Provider Profiles And Durable File Cache`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Hosted/self-hosted/BYO S3-compatible storage profiles are explicit, non-secret metadata is visible to users/admins, provider secrets stay server-side, and the SDK has a durable local cache/pinning path for downloaded files.
- **Files**:
  - `packages/auth-server-hono/src/db/schema/*`: add storage provider profile schema and migration if server-side profile persistence is needed.
  - `packages/auth-server-hono/src/env.ts`: keep env-based hosted provider config and validate profile IDs.
  - `packages/auth-server-hono/src/lib/storage.ts`: introduce a provider-profile interface over the existing S3-compatible adapter.
  - `packages/auth-server-hono/src/routes/files.ts`: resolve uploads/downloads through provider profiles, not only global env.
  - `packages/auth-server-hono/src/routes/files.test.ts`: cover provider selection, missing provider, and secret-safe responses.
  - `packages/db/src/utils/files.ts`: add cache/pin/unpin helpers if accepted as public SDK API.
  - `packages/db/src/utils/files.test.ts`: cover hash verification, cache hits, and unpinned eviction eligibility.
  - `packages/app/src/pages.tsx` or a storage settings component: show current provider profile and setup state without exposing secrets.
  - `docs/deployment/file-storage.md`: document Railway Buckets/S3-compatible setup and self-hosted profile mapping.
  - `.changeset/*`: add if `@eweser/db` or `@eweser/shared` public APIs change.
- **Steps**:
  - [x] Define hosted, self-hosted, and BYO profile metadata. Exclude access keys, secret keys, tokens, and provider dashboards from synced/user-visible data.
  - [x] Keep the current env-only path working as the default hosted/self-hosted provider.
  - [x] Add BYO S3-compatible profile storage only if there is an approved secret-storage path; otherwise document it as operator-configured env for this run.
  - [x] Implement local cache indexing keyed by `remoteProviderProfileId`, `remoteObjectKey`, and `contentHash`.
  - [x] Verify downloaded bytes against `contentHash` before marking a file pinned/available.
  - [x] Add user-facing setup/error copy for “storage not configured”, “profile unavailable”, and “file too large”.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- files`
  - `npm test --workspace @eweser/db -- files`
  - `npm run type-check --workspace @eweser/app`
  - `npm run build --workspace @eweser/db`
- **Verification**:
  - Mock S3-compatible storage in tests; optionally run a local configured storage smoke only with explicitly provided non-committed credentials.
- **Manual test handoff**:
  - Delivered behavior: file upload/presign/download now resolve through an explicit S3-compatible provider profile. The default env-backed profile remains the only supported profile in this run; unknown profile ids fail with `Storage provider profile unavailable`, unconfigured storage returns `Object storage is not configured`, and the account app shows secret-safe profile status. SDK downloads now include profile id in presign requests, verify `contentHash`, write verified bytes to an IndexedDB cache, and expose `pinFile`, `unpinFile`, `removeCachedFile`, and `getFileCacheStatus`.
  - Local services/commands: use the auth API with object-storage env configured as documented in `docs/deployment/file-storage.md`; run the app with `npm run dev --workspace @eweser/app` if checking the account storage card.
  - Test data/account assumptions: use a signed-in local account with a writable `fileAttachments` room and non-production S3-compatible credentials in ignored env only.
  - Manual steps: upload an attachment through the existing attachment flow or route; verify the returned metadata has `remoteProviderProfileId`; reload in a fresh browser profile; download the file; call or exercise the SDK `pinFile` path; stop or block network access to the auth/storage service; call `downloadFile` for the same attachment and confirm cached bytes are returned.
  - Expected results: profile metadata is visible without secrets; wrong profile ids fail; hash mismatch prevents caching; pinned verified bytes remain available locally.
  - Known gaps/residual risk: no real provider credentials or live S3 smoke were used in this coding pass. User-submitted BYO credentials remain intentionally out of scope until a separate secret-storage design is approved.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 3: User Snapshot Backups And Restore

- **Id**: `run-3`
- **Title**: `User Snapshot Backups And Restore`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Users can create, list, download, and restore database snapshots into a configured storage provider with explicit retention and restore verification.
- **Files**:
  - `packages/shared/src/collections/*`: add backup/snapshot metadata collection if synced backup metadata belongs in rooms.
  - `packages/db/src/utils/backup.ts`: create client-side snapshot/export and restore helpers over loaded rooms.
  - `packages/db/src/index.ts`: export backup helpers if public.
  - `packages/auth-server-hono/src/routes/backups.ts`: add server-mediated upload/download or signed URL routes if snapshots use object storage.
  - `packages/auth-server-hono/src/index.ts`: mount backup routes.
  - `packages/app/src/pages.tsx` or settings components: minimal backup/restore UI.
  - `docs/deployment/digital-ocean.md` and `docs/deployment/file-storage.md`: distinguish operator backups from user snapshots.
  - `.changeset/*`: add for public `@eweser/db` or `@eweser/shared` API changes.
- **Steps**:
  - [x] Decide and document snapshot format: Yjs update bytes, normalized JSON export, or a bundle containing both.
  - [x] Store backup metadata in user-owned room data when it should sync across apps; store operational upload state in auth-server Postgres only if needed.
  - [x] Add snapshot creation for selected rooms and all accessible rooms.
  - [x] Add restore dry-run that reports target rooms, document counts, conflicts, and irreversible actions before writing.
  - [x] Add restore apply behavior using CRDT-safe writes, with keep-both conflict handling by default.
  - [x] Add retention defaults and cleanup hooks that never delete snapshots without explicit user/admin policy.
- **Tests**:
  - `npm test --workspace @eweser/db -- backup`
  - `npm test --workspace @eweser/auth-server-hono -- backups`
  - Shared package build/tests if new collection types are added.
- **Verification**:
  - Create a fixture room, snapshot it, delete/modify documents locally, run restore dry-run, apply restore, and verify documents match expected state.
- **Manual test handoff**:
  - Delivered behavior: `@eweser/db` exports snapshot helpers for creating v1 JSON bundles, serializing/parsing snapshots, dry-run restore, CRDT-safe restore, upload, list, signed-download lookup, and hash-checked download. Snapshot bundles include normalized room documents plus per-room base64 Yjs updates. Auth API routes at `/api/backups` upload/list/download snapshot metadata through the configured storage provider profile. Account home lists saved snapshots and can request a signed download URL. Operational snapshot metadata is stored in auth-server PostgreSQL; no provider secrets are exposed.
  - Local services/commands: run `npm run dev:docker`, then run the auth app with `npm run dev --workspace @eweser/app` and an SDK-using app or console harness that can access a logged-in `Database` instance. Object-storage env must be configured as described in `docs/deployment/file-storage.md`.
  - Test data/account assumptions: use a local signed-in account, local rooms with non-production note/fixture data, and ignored S3-compatible credentials only.
  - Manual steps: create or load a room with at least one document; call `createDatabaseSnapshot({ db })`; call `dryRunRestoreDatabaseSnapshot({ db, snapshot })` and confirm room/document counts; call `uploadDatabaseSnapshot({ db, snapshot })`; open account home and verify the snapshot row appears; download the snapshot; edit or delete a fixture document locally; call `restoreDatabaseSnapshot({ db, snapshot })`; verify the original and restored documents both exist when IDs conflict.
  - Expected results: snapshot upload stores an object under the backup prefix, account home lists secret-safe snapshot metadata, downloads verify `contentHash`, dry-run reports conflicts before writes, and restore defaults to keep-both conflict handling.
  - Known gaps/residual risk: no live S3/provider smoke or browser manual pass was run in this coding pass. The account UI lists/downloads snapshots; create and restore are SDK-level flows for now because room data lives in client apps, not the auth account shell. Expired retention metadata is recorded but no automatic deletion job exists by design.
- **Dependencies**:
  - `run-2`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 4: Federation Identity And Server Trust Foundation

- **Id**: `run-4`
- **Title**: `Federation Identity And Server Trust Foundation`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - Each auth server has a stable public server identity, peer registry, signed server-to-server request validation, and current docs replacing the historical federation plan as implementation guidance.
- **Files**:
  - `packages/auth-server-hono/src/db/schema/*`: add server identity and federation peer tables.
  - `packages/auth-server-hono/drizzle/*`: add append-only migration.
  - `packages/auth-server-hono/src/routes/federation.ts`: add peer registration, peer lookup, signed request verification endpoints.
  - `packages/auth-server-hono/src/routes/well-known.ts` or existing route mounting: expose `/.well-known/eweser-server`.
  - `packages/auth-server-hono/src/services/federation/*`: key generation, signature creation/verification, replay protection, peer cache.
  - `packages/shared/src/*`: add federated principal parsing/types only if needed by downstream code.
  - `ARCHITECTURE.md`: document server identity and peer registry once current.
  - `.changeset/*`: add if published shared types are introduced.
- **Steps**:
  - [ ] Choose Ed25519 or another explicit signing algorithm and store private key material only server-side.
  - [ ] Add `/.well-known/eweser-server` with public key, auth API URL, sync URL, and federation API URL.
  - [ ] Add signed request middleware with timestamp/replay window.
  - [ ] Add federation peer registration and block/disable state.
  - [ ] Add tests for key generation, well-known output, signature verification, timestamp rejection, and peer registration.
  - [ ] Update the historical federation assumptions into current architecture notes without treating the old `packages/auth-server/` references as current.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- federation`
  - `npm run type-check --workspace @eweser/auth-server-hono`
  - `npm run code-index:check`
- **Verification**:
  - Start two auth-server instances with separate databases/configs in tests or a scripted smoke and verify they can exchange signed peer registration requests.
- **Manual test handoff**:
  - Not needed for user-visible UI; provide curl commands that show the well-known response and a rejected unsigned federation request.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 5: Federated Room Sharing And Relay Sync

- **Id**: `run-5`
- **Title**: `Federated Room Sharing And Relay Sync`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - A user on one auth server can invite a user on another auth server to a room; the recipient can access the room through their home server with enforced read/write permissions.
- **Files**:
  - `packages/auth-server-hono/src/routes/federation.ts`: invite, accept, room-token issuance, and relay lifecycle APIs.
  - `packages/auth-server-hono/src/services/access-grant/*`: extend invite/grant logic to federated principals.
  - `packages/auth-server-hono/src/services/sync-token.ts`: add federated relay token claims if required.
  - `packages/auth-server-hono/src/db/schema/rooms.ts`: add federated ACL representation only if current arrays cannot safely hold federated principals.
  - `packages/sync-server/src/index.ts`: add relay connection management or extract a federation relay extension module.
  - `packages/db/src/methods/connection/generateShareRoomLink.ts`: support federated invite targets if SDK surface is approved.
  - `packages/app/src/pages.tsx` and/or Ewe Note share UI: invite by `user@server` and display remote server badges.
  - `e2e/cypress/tests/*`: add two-server federated share smoke if practical.
  - `.changeset/*`: add for published SDK/shared API changes.
- **Steps**:
  - [ ] Define federated principal storage and display behavior.
  - [ ] Add remote invite send/receive flow using signed server-to-server requests from `run-4`.
  - [ ] Add relay sync connection where a participating server acts as a Hocuspocus client to the origin server.
  - [ ] Enforce read/write/admin permissions at the origin and recipient home server.
  - [ ] Ensure revocation and room deletion disconnect or disable relay access.
  - [ ] Add a two-server local test harness with deterministic ports and isolated databases.
  - [ ] Update docs to explain federation as server relay, not P2P or ActivityPub.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- federation access-grant`
  - `npm run type-check --workspace @eweser/sync-server`
  - `npm test --workspace @eweser/db`
  - Targeted Cypress/e2e two-server smoke if the harness is stable.
- **Verification**:
  - Two local servers: Alice on server A shares a room with Bob on server B; Bob edits when granted write access; Alice sees the edit; revocation prevents further Bob writes.
- **Manual test handoff**:
  - Provide exact two-server startup commands, user/account assumptions, invite URL, expected room registry state on both servers, and the revocation check.
- **Dependencies**:
  - `run-4`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 6: Federation As Backup

- **Id**: `run-6`
- **Title**: `Federation As Backup`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Users can nominate a trusted peer server as a read-only or standby backup listener for selected rooms, inspect backup freshness, and restore or fail over from that peer when appropriate.
- **Files**:
  - `packages/auth-server-hono/src/routes/federation.ts`: backup-listener registration, status, revoke, and restore/failover endpoints.
  - `packages/sync-server/src/index.ts` or federation relay module: idle relay lifecycle and persistence health reporting.
  - `packages/app/src/pages.tsx` or settings surface: backup peer setup/status.
  - `docs/deployment/federation.md`: operator setup, trust model, and recovery steps.
  - `docs/security-go-live-checklist.md`: add federation backup drill once implemented.
- **Steps**:
  - [ ] Define “backup listener” separately from a human collaborator grant.
  - [ ] Add room-level opt-in for backup peers with read-only default.
  - [ ] Track last relay sync time, last error, and room byte/update counts without logging content.
  - [ ] Add restore/failover dry-run that shows which rooms would be imported or reattached.
  - [ ] Add revoke behavior that stops relay and prevents future sync.
  - [ ] Document trust implications: backup peer can see plaintext unless the room is E2EE.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- federation`
  - Sync-server relay lifecycle tests or type-check/build if integration tests are impractical.
  - E2E smoke after `run-5` harness exists.
- **Verification**:
  - In a two-server local smoke, enable backup listener, write documents on origin, verify backup freshness, stop origin, and verify documented restore/failover dry-run behavior.
- **Manual test handoff**:
  - Follow `docs/deployment/federation.md` against two local instances and record backup freshness and restore dry-run output.
- **Dependencies**:
  - `run-4`; `run-5` recommended
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 7: E2EE Architecture And Key Management ADR

- **Id**: `run-7`
- **Title**: `E2EE Architecture And Key Management ADR`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - A current ADR and prototype-level technical decision for opt-in encrypted rooms, including multi-device key sharing, recovery limits, collaboration/search/MCP tradeoffs, and migration boundaries. Should be user freindly and allow authenticating with various methods like passkey, authenticator app, etc.
- **Files**:
  - `docs/ai/adr/*`: add room-level E2EE ADR.
  - `ARCHITECTURE.md`: update only after decision is accepted as current.
  - `packages/db/src/*`: optional small prototype/spike under tests only, if useful and kept inside plan approval.
  - `packages/app/src/pages.tsx` or docs copy references: update any privacy statements if they need clearer no-E2EE language before implementation.
- **Steps**:
  - [ ] Define threat model: hosted server, malicious app, lost device, collaborator, MCP/AI agent, public aggregator.
  - [ ] Decide encryption granularity: whole Yjs update stream, document fields, room snapshots, or separate encrypted payload documents.
  - [ ] Decide key storage and multi-device transfer: passphrase-derived, device key wrapping, recovery phrase, or explicit export/import.
  - [ ] Decide what encrypted rooms lose: server-side search, public aggregation, remote MCP reading, account recovery, and possibly collaborative editing.
  - [ ] Prototype a minimal encrypt/decrypt round trip with real Yjs docs in a test or document why implementation should wait.
  - [ ] Define migration behavior for converting a plaintext room to encrypted and back, including stop conditions.
- **Tests**:
  - Prototype-only tests if code is added.
  - ADR review against `docs/ai/adr/0004-privacy-and-autonomy.md` and compliance notes.
- **Verification**:
  - Confirm docs still make honest privacy claims and no product surface implies E2EE before it ships.
- **Manual test handoff**:
  - Not needed: architecture decision run only.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 8: Opt-In Encrypted Rooms MVP

- **Id**: `run-8`
- **Title**: `Opt-In Encrypted Rooms MVP`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Users can create or mark selected rooms as encrypted, unlock them on another device with approved key material, and see clear limitations when search, public aggregation, or MCP access is unavailable.
- **Files**:
  - `packages/shared/src/collections/*`: add encryption metadata types if shared room metadata is needed.
  - `packages/db/src/room.ts`: add encrypted-room metadata and local unlock state.
  - `packages/db/src/methods/connection/loadRoom.ts`: apply encryption/decryption at the approved boundary from `run-7`.
  - `packages/db/src/utils/*`: key derivation, key wrapping, and encrypted storage helpers.
  - `packages/auth-server-hono/src/routes/access-grant.ts`: ensure grants and sync tokens do not leak room keys.
  - `packages/aggregator/src/webhook-handler.ts`: reject encrypted rooms from plaintext indexing.
  - `packages/app/src/pages.tsx` and Ewe Note settings: unlock/create encrypted room UI with warnings.
  - `.changeset/*`: add for published SDK/shared API changes.
- **Steps**:
  - [ ] Implement the smallest room-level E2EE shape approved in `run-7`.
  - [ ] Keep keys client-side; never send keys to auth-server, sync-server, aggregator, logs, screenshots, ordinary memory, or Yjs plaintext fields.
  - [ ] Add lock/unlock state and explicit user-facing unavailable states for search/MCP/public aggregation.
  - [ ] Add multi-device key import/export or pairing flow.
  - [ ] Add migration guardrails and rollback behavior.
  - [ ] Update legal/privacy copy only to the exact shipped capability.
- **Tests**:
  - `npm test --workspace @eweser/db -- encryption`
  - `npm test --workspace @eweser/aggregator`
  - `npm test --workspace @eweser/app`
  - `npm run check` if cross-package changes land.
- **Verification**:
  - Create encrypted room, sync through Hocuspocus, unlock on second browser profile, verify server-side search does not expose plaintext and locked clients cannot read content.
- **Manual test handoff**:
  - Use two browsers/devices, create an encrypted room, transfer key, edit content, lock/unlock, verify unavailable public search/MCP states.
- **Dependencies**:
  - `run-7`
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 9: Schema/API Versioning And Compatibility

- **Id**: `run-9`
- **Title**: `Schema/API Versioning And Compatibility`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - EweserDB has documented compatibility rules, machine-readable SDK/server/schema versions, room data migration helpers, and tests that prevent accidental incompatible public API or schema changes.
- **Files**:
  - `packages/shared/src/versioning/*`: add schema version contracts and migration metadata helpers if approved.
  - `packages/db/src/*`: expose SDK compatibility metadata and room migration hooks if public.
  - `packages/auth-server-hono/src/routes/*`: expose server capability/version endpoint.
  - `packages/sync-server/src/index.ts`: include sync protocol/capability version in health or auth response if needed.
  - `docs/ai/adr/*`: add compatibility/versioning ADR.
  - `README.md`, `ARCHITECTURE.md`, `packages/db/README.md`: document policy.
  - `.changeset/*`: add for published package API changes.
- **Steps**:
  - [ ] Define semantic categories: SDK API, shared collection schemas, auth API, sync protocol, aggregator API, storage provider API.
  - [ ] Add a capability/version endpoint for server components.
  - [ ] Add collection schema version metadata and migration helper conventions that use CRDT-safe writes.
  - [ ] Add compatibility tests with old fixture documents and current code.
  - [ ] Update changeset guidance for schema-breaking, schema-additive, and internal-only changes.
  - [ ] Add docs for pre-live breaking-change policy versus post-launch compatibility guarantees.
- **Tests**:
  - `npm test --workspace @eweser/shared -- version`
  - `npm test --workspace @eweser/db -- migration version`
  - `npm test --workspace @eweser/auth-server-hono`
  - `npm run code-index:check`
- **Verification**:
  - Load fixture room data from at least one older schema shape and verify migration or compatibility behavior is deterministic.
- **Manual test handoff**:
  - Not needed unless UI capability display is added.
- **Dependencies**:
  - None
- **Model tier**: `strong`
- **Risk level**: `high`

### Run 10: SDK Lifecycle Reliability Backlog

- **Id**: `run-10`
- **Title**: `SDK Lifecycle Reliability Backlog`
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**:
  - The SDK cleans expired soft-deleted docs, refreshes sync tokens after auth failures, reconnects predictably after online recovery, supports any approved first-run seed API, and either implements or removes stale WebRTC temp-doc scope.
- **Files**:
  - `packages/db/src/index.ts`: lifecycle options, startup scheduling, online recovery hooks, optional seeded data API.
  - `packages/db/src/methods/connection/loadRoom.ts`: authentication-failed token refresh/reconnect behavior.
  - `packages/db/src/utils/connection/*`: online/offline event integration and reconnect policy.
  - `packages/db/src/utils/getDocuments.ts` or `packages/shared/src/utils/documents.ts`: expired tombstone purge helpers, depending on ownership.
  - `packages/db/src/room.ts`: temp-doc/WebRTC decision if still relevant.
  - `packages/db/src/index.test.ts` and connection tests: cover cleanup and recovery behavior.
  - `examples/example-basic/src/AppBasic.tsx`: demonstrate only if API changes need teaching.
  - `.changeset/*`: add for public `@eweser/db` API changes.
- **Steps**:
  - [ ] Add `deleteExpiredDocuments` helper that removes docs only when `_deleted` is true and `_ttl` is older than now.
  - [ ] Schedule cleanup after rooms load and roughly daily, with an SDK option to disable or tune interval for tests.
  - [ ] On `authenticationFailed`, clear stale room sync token, call `refreshSyncToken`, and reconnect once with bounded backoff before surfacing error.
  - [ ] Listen to browser online/offline events where available and reconcile with existing ping polling.
  - [ ] Decide whether “reload when re-online” means reconnect rooms, reload registry, or full page reload; implement reconnect/registry refresh by default unless app-level reload is explicitly approved.
  - [ ] Decide if `initialRooms` is enough. If not, add `initialDocuments`/seed callback semantics that are idempotent and CRDT-safe.
  - [ ] Decide WebRTC fate: implement a contained temp-doc API with clear non-secure warning, or remove `y-webrtc` dependency/types and stale default peers.
- **Tests**:
  - `npm test --workspace @eweser/db`
  - `npm run type-check --workspace @eweser/db`
  - `npm run build --workspace @eweser/db`
- **Verification**:
  - Unit tests with fake timers for TTL cleanup and reconnect backoff; mock provider/auth failure for token refresh retry.
- **Manual test handoff**:
  - Not needed for non-UI SDK internals, unless example app seed/reconnect behavior is updated.
- **Dependencies**:
  - None
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 11: Access Grant Existing-Permission Fast Path

- **Id**: `run-11`
- **Title**: `Access Grant Existing-Permission Fast Path`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - If a signed-in user already has a valid app grant that satisfies the login request, the auth app redirects back with a token instead of showing the permission page.
- **Files**:
  - `packages/auth-server-hono/src/services/access-grant/create-third-party-app-permissions.ts`: factor grant satisfaction comparison and token minting.
  - `packages/auth-server-hono/src/routes/access-grant.ts`: add a safe “resolve existing grant” endpoint or extend bootstrap response.
  - `packages/app/src/lib/login-query.ts`: route post-auth flow through grant resolution before building the permission path.
  - `packages/app/src/pages.tsx`: handle auto-redirect loading/error states.
  - `packages/auth-server-hono/src/routes/access-grant.test.ts`: cover exact match, superset match, invalid grant, and insufficient grant.
  - `packages/app/src/*test*`: cover redirect behavior.
- **Steps**:
  - [ ] Define “matches” and “satisfies”: exact domain, valid grant, non-expired/keepAlive policy, requested collections and rooms are subsets of existing grant.
  - [ ] Add server-side check that mints a fresh token only for the signed-in owner and matching domain/redirect validation.
  - [ ] Preserve the permission page when the requested access exceeds the existing grant.
  - [ ] Avoid client-side-only decisions; the server must own grant satisfaction and token issuance.
  - [ ] Add copy for the brief “already approved, redirecting” state if visible.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- access-grant`
  - `npm test --workspace @eweser/app`
  - `npm run type-check --workspace @eweser/app`
- **Verification**:
  - Sign in once and approve a grant, sign in again from the same requesting app, and verify it redirects without showing permission UI; request broader permissions and verify the page still appears.
- **Manual test handoff**:
  - Use `examples/example-basic` login twice with the same domain/collections/rooms, then with broader permissions.
- **Dependencies**:
  - None
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 12: Cross-Collection Query Layer And Size Limits

- **Id**: `run-12`
- **Title**: `Cross-Collection Query Layer And Size Limits`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - Apps can query refs across loaded collections in a supported way, aggregator search can optionally filter by refs, and docs/tests describe practical room/document size limits.
- **Files**:
  - `packages/shared/src/utils/documents.ts`: add ref parsing helpers if not already present.
  - `packages/db/src/utils/query.ts`: add local query/ref lookup helpers over loaded rooms.
  - `packages/db/src/index.ts`: export query helpers if public.
  - `packages/aggregator/src/db/schema.ts`: add indexed ref fields only if required for server-side queries.
  - `packages/aggregator/src/db/queries.ts`: add ref/collection filters and limits.
  - `examples/example-basic/src/AppBasic.tsx`: replace ad hoc cross-ref demo logic with supported helper usage.
  - `packages/db/README.md`: document local queries, limitations, and when to use aggregator.
  - `.changeset/*`: add for published package API changes.
- **Steps**:
  - [ ] Define v1 query scope: loaded rooms only for SDK, indexed public/agent-accessible rooms for aggregator.
  - [ ] Add `parseRef` companion to `buildRef`.
  - [ ] Add local helpers such as `findDocumentsReferencing(ref)` and `resolveRef(ref)` with clear loaded-room behavior.
  - [ ] Add aggregator extraction of `_ref` fields and explicit ref arrays where practical.
  - [ ] Add max result limits, pagination, and query-time safeguards.
  - [ ] Add stress fixtures for large document counts and large payload warnings.
  - [ ] Document recommended room counts, document counts, payload sizes, and when to split rooms.
- **Tests**:
  - `npm test --workspace @eweser/shared -- ref`
  - `npm test --workspace @eweser/db -- query`
  - `npm test --workspace @eweser/aggregator`
  - `npm run build --workspace @eweser/db`
- **Verification**:
  - Use example-basic notes and flashcards to query “all notes that reference this flashcard” locally; verify aggregator ref filter only returns indexed public/authorized data.
- **Manual test handoff**:
  - In the kitchen-sink example, create a flashcard from a note, then use the new query UI/demo path to find linked notes from the flashcard.
- **Dependencies**:
  - `run-1` for aggregator-side public safety
- **Model tier**: `coder`
- **Risk level**: `medium`

### Run 13: Stress Testing And Hosted Sync Usage Metering

- **Id**: `run-13`
- **Title**: `Stress Testing And Hosted Sync Usage Metering`
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**:
  - The project has repeatable stress tests for room/document/load behavior, documented warning thresholds, and hosted sync usage metering hooks that can later connect to billing or free-tier limits.
- **Files**:
  - `scripts/stress/*` or `packages/db/src/*.stress.test.ts`: add deterministic load generators for room count, document size, and concurrent sync.
  - `packages/sync-server/src/index.ts`: emit connection/session usage events without document content.
  - `packages/auth-server-hono/src/db/schema/*`: add usage event or aggregate table if hosted limits need persistence.
  - `packages/auth-server-hono/drizzle/*`: add append-only migration if usage persistence is added.
  - `packages/auth-server-hono/src/routes/usage.ts`: expose signed-in usage summaries.
  - `packages/app/src/pages.tsx`: show usage summary/limit warning if UI is approved.
  - `docs/deployment/minimum-specs.md`: document tested thresholds and hosted warnings.
  - `packages/db/README.md`: add concise room/document size guidance.
- **Steps**:
  - [ ] Define stress dimensions: rooms per app, docs per room, average document bytes, Yjs update size, concurrent providers, reconnect storms.
  - [ ] Add local stress script that can run against fake IndexedDB and optional Docker backend.
  - [ ] Record current thresholds and warnings without overstating guarantees.
  - [ ] Add sync-server usage events for connection start/stop, room ID, collection key, user ID where known, and duration. Do not log document content.
  - [ ] Add auth-server aggregation for daily active sync minutes/hours by user and room.
  - [ ] Add limit hooks that can warn or reject new hosted sync connections when a configured free-tier limit is exceeded.
  - [ ] Keep payment-provider integration out of this run unless separately approved.
- **Tests**:
  - `npm test --workspace @eweser/auth-server-hono -- usage`
  - `npm run type-check --workspace @eweser/sync-server`
  - Stress script dry-run against small fixture counts.
  - `npm run check` if schema/UI changes land.
- **Verification**:
  - Run small/medium stress profiles locally, verify no content appears in logs, and verify usage summary matches expected synthetic connection durations.
- **Manual test handoff**:
  - Start Docker backend, run the documented small stress profile, inspect usage page/API for the synthetic user, and confirm threshold warning copy appears when configured low.
- **Dependencies**:
  - `run-12` recommended for size guidance; otherwise independent
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop and ask for user approval if:

- Implementation would index, expose, export, upload, log, screenshot, or store user content in a new place not described by this plan.
- A run requires real storage provider credentials, billing provider credentials, OAuth secrets, private keys, or production data.
- A public package API change is needed but no changeset can be added.
- A PostgreSQL schema change is needed but no append-only Drizzle migration can be generated.
- E2EE implementation requires sending room keys to the server, aggregator, MCP server, logs, screenshots, or ordinary memory.
- Federation design requires deleting or rewriting existing migrations, bypassing room ACL checks, or trusting unsigned server-to-server requests.
- Verification exposes private-data leakage through aggregator search, logs, usage telemetry, backups, or public docs.
- The work drifts into app-shell redesign, public legal/compliance launch tasks, or payment collection beyond metering hooks.

## Approval Boundary

Approval of this plan authorizes Coder to implement the runs above, make focused supporting edits needed for those runs, write/update tests, run relevant verification, perform internal QA, fix issues found inside this boundary, create required changesets, generate append-only migrations where explicitly called out, and update this plan's execution summary.

Approval does not authorize unrelated refactors, direct pushes to `main`, destructive git operations, migration deletion, secret handling in committed files, production credential use, real payment collection, reintroducing Next.js/Supabase architecture, or claiming E2EE/public-search safety before the relevant run is implemented and verified.

## Execution Summary

| Run      | Status      | Files Changed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Verification                                                                                                                                                                                                                                                                                                       | Notes                                                                                                                                                                                                                     |
| -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run-1`  | Complete    | `packages/aggregator/src/**`, `packages/aggregator/README.md`, `packages/auth-server-hono/src/model/rooms/calls.ts`, `packages/auth-server-hono/src/routes/access-grant.ts`, `packages/auth-server-hono/src/routes/access-grant.test.ts`, `packages/auth-server-hono/src/routes/agents.ts`, `packages/auth-server-hono/src/services/rooms/*`, `packages/auth-server-hono/src/services/sync-token.ts`, `packages/sync-server/src/index.ts`, `examples/example-aggregator/src/App.tsx`                                                                                                                                                                          | `npm test --workspace @eweser/aggregator`; `npm test --workspace @eweser/auth-server-hono`; `npm run type-check --workspace @eweser/sync-server`; `npm run type-check --workspace @eweser/aggregator`; `npm run build --workspace @eweser/example-aggregator`                                                      | Implemented room-level public aggregation gate and manual-test handoff. Follow-up fixed serialized Yjs webhook payloads; local Docker SDK-style search smoke now passes for published content.                            |
| `run-2`  | Complete    | `packages/auth-server-hono/src/lib/storage.ts`, `packages/auth-server-hono/src/routes/files.ts`, `packages/auth-server-hono/src/routes/files.test.ts`, `packages/auth-server-hono/src/routes/account.ts`, `packages/auth-server-hono/src/routes/account.test.ts`, `packages/db/src/utils/files.ts`, `packages/db/src/utils/files.test.ts`, `packages/app/src/lib/api.ts`, `packages/app/src/pages.tsx`, `docs/deployment/file-storage.md`, `docs/deployment/railway.md`, `.changeset/file-cache-pinning.md`                                                                                                                                                   | `npm test --workspace @eweser/auth-server-hono -- files`; `npm test --workspace @eweser/db -- files`; `npm run type-check --workspace @eweser/app`; `npm run build --workspace @eweser/db`                                                                                                                         | Added env-backed storage provider profile resolution, secret-safe profile status, profile-aware file routes, verified SDK cache/pinning helpers, docs, and changeset. Follow-up added `fileAttachments` bootstrap/repair. |
| `run-3`  | Complete    | `packages/db/src/utils/backup.ts`, `packages/db/src/utils/backup.test.ts`, `packages/db/src/index.ts`, `packages/db/src/utils/index.ts`, `packages/auth-server-hono/src/db/schema/backup_snapshots.ts`, `packages/auth-server-hono/src/model/backup-snapshots.ts`, `packages/auth-server-hono/src/routes/backups.ts`, `packages/auth-server-hono/src/routes/backups.test.ts`, `packages/auth-server-hono/src/index.ts`, `packages/auth-server-hono/drizzle/0008_backup_snapshots.sql`, `packages/app/src/lib/api.ts`, `packages/app/src/pages.tsx`, `docs/deployment/file-storage.md`, `docs/deployment/digital-ocean.md`, `.changeset/file-cache-pinning.md` | `npm test --workspace @eweser/db -- backup`; `npm test --workspace @eweser/auth-server-hono -- backups`; `npm test --workspace @eweser/auth-server-hono -- files`; `npm run build --workspace @eweser/db`; `npm run type-check --workspace @eweser/app`; `npm run type-check --workspace @eweser/auth-server-hono` | Added v1 snapshot bundle helpers, server-mediated upload/list/download routes, backup snapshot metadata table/migration, account snapshot listing/download UI, docs, and changeset. No live S3/browser smoke was run.     |
| `run-4`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-5`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-6`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-7`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-8`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-9`  | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-10` | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-11` | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-12` | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |
| `run-13` | Not started |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |                                                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                                                           |

Review update, 2026-05-20: pre-PR QA ran `npm run check`,
`npm run code-index:check`, `npm run build --workspace @eweser/app`,
`npm run build --workspace @eweser/aggregator`, and
`npm run build --workspace @eweser/example-aggregator`. The review also made
the forgot-password app test compatible with per-worktree auth API URLs and
formatted `test-mcp-client.mjs` because it blocked the repo-wide Prettier gate.
Live Docker/browser and real S3-provider smoke checks remain manual gaps.

Manual tester fix update, 2026-05-20: fixed the two open issues from the
Run 2/3 smoke. Published aggregator demo content is now searchable because the
sync server posts serialized EweserDB Yjs state through a custom aggregator
webhook extension, and the aggregator accepts the current Hocuspocus payload
shape. New-account bootstrap now ensures seven starter rooms, including a
private `fileAttachments` room, and repairs already-bootstrapped accounts that
miss that room. Verification included sync-server, aggregator, and auth-server
unit/type checks, a rebuilt local Docker stack, an SDK-style sync-to-search
smoke that returned the unique public note term, and a container-side bootstrap
smoke proving `roomCount: 7`, `hasFileAttachments: true`, and grant coverage for
all rooms. Disposable bootstrap smoke rows were cleaned up.

## Self-Reflection / Instruction Improvements

- The DB package README accumulated completed and obsolete TODOs because no current plan linked the checklist to implementation status. Keep README backlog items linked to current plan files, and remove items when they are completed or intentionally archived.
