# Plan: File Storage & AI Data Layer

> **Created:** 2026-04-03
> **Updated:** 2026-05-04
> **Status:** Draft — awaiting approval
> **Depends on:** AI-First Launch Strategy (Run 2 schemas), Privacy & Autonomy (Run P3 agent permissions)

## Goal

Add a general-purpose file and data storage layer to EweserDB that handles both binary files (images, PDFs, video) and text-based AI data (agent configs, chat logs, server backups). Position EweserDB as the **personal AI brain** — the place your agents back up to, restore from, and search across.

## The Two Storage Paths

Most "AI brain" use cases are actually **text** (configs, logs, conversations, YAML, JSON, markdown). These should flow through Yjs — full CRDT merge, version history built-in, searchable. Only actual binary blobs need object storage.

### Path 1: Text data → Yjs documents (CRDT, versioned, searchable)

| Use case                         | Collection type                 | Why Yjs works                       |
| -------------------------------- | ------------------------------- | ----------------------------------- |
| AI chat logs / conversations     | `conversations`                 | Text, append-only, searchable       |
| Agent configs (Claude, OpenClaw) | `agentConfigs` / `agentBackups` | JSON/YAML — small, mergeable        |
| OpenClaw workspace skills backup | `agentBackups`                  | Markdown files — CRDT merge natural |
| `.claude.json`, `CLAUDE.md`      | `agentBackups`                  | Config files — version history free |
| Agent run logs                   | `agentAccessLogs`               | Structured data                     |
| Bookmarks / web clips            | `bookmarks`                     | Text + metadata                     |

These are cheap to store (60 MB for 10,000 items), work offline, CRDT-merge across devices, and have full version history via Yjs's operation log. **Free on eweser.com.**

### Path 2: Binary files → Object storage (MinIO / R2, content-addressed)

| Use case                           | Why not Yjs                 |
| ---------------------------------- | --------------------------- |
| Images embedded in notes           | Can't CRDT-merge a JPEG     |
| PDF attachments                    | Binary, can be large        |
| Video / audio recordings           | Way too large for IndexedDB |
| Screenshots from browser extension | Binary images               |

Binary files are stored in S3-compatible object storage. Yjs documents store only a content-addressed reference (SHA-256 hash + URL). Hosted Eweser storage may be premium because storage costs real money per GB, but the architecture must also support self-hosted and bring-your-own-storage provider profiles.

### Provider Strategy: Hosted, Self-Hosted, Bring Your Own Storage

The storage layer should not hard-code one bucket owner.

- **Hosted Eweser storage:** Eweser-managed bucket, quota enforcement, simplest onboarding.
- **Self-hosted MinIO:** local or self-hosted object storage for Docker/self-host deployments.
- **Bring your own storage:** S3-compatible endpoint profile for Cloudflare R2, AWS S3, Backblaze B2, or similar providers.

Provider credentials are secrets. They must never live in Yjs documents, Obsidian import manifests, screenshots, ordinary memory, logs, or committed fixtures. Synced metadata should store only provider profile ids, object keys, hashes, MIME types, sizes, and non-secret routing metadata.

### The Document Problem

Binary files **cannot** be CRDT-merged. If two devices modify the same PDF or image, you get a conflict, not a merge. For binary files, the conflict resolution strategy is:

- **Last-write-wins** for single-writer files (screenshots, captures — one device creates them)
- **Keep-both** for genuine conflicts (renamed with `-conflict-<timestamp>` suffix, user resolves manually)

This is **not** a problem for text-based data (configs, logs, markdown), which is why most AI-brain use cases should ride the Yjs path.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Any App / MCP Agent / Browser Extension / CLI                      │
│                                                                     │
│  Text data (configs, logs, conversations)                           │
│  ────────────────────────────────────────→  Yjs CRDT room           │
│           (CRDT merge, versioned, searchable)      ↕ Hocuspocus     │
│                                                                     │
│  Binary files (images, PDFs, video)                                 │
│  ────────────────────────────────────────→  Upload API → MinIO/R2   │
│           (content-addressed, pre-signed URLs)                      │
│                                                                     │
│  FileRef in Yjs doc: { hash: "sha256:abc", url: "...", ... }       │
│                                                                     │
│  Local cache: IndexedDB (text always, files = user-pinned subset)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Selective Offline / "Pin to Device"

IndexedDB has soft limits (~50–100 MB in practice). For text data this is never a problem. For binary files:

- By default, binary files are **not** cached locally — they stream from server on demand
- User can **pin** individual files or rooms to keep offline (stored in IndexedDB or via File System Access API)
- The SDK tracks pinned vs. unpinned in a `syncSettings` room per device
- Eviction policy: LRU for unpinned cache, never evict pinned files

Settings UI shows per-room: "Keep on this device" toggle, with a storage usage indicator.

### Version History for Text Data

Yjs already maintains the full operation log. We expose this as:

- **Snapshots** — named points in time (auto-created on each sync, user can name them). Think git commits.
- **Diff view** — compare any two snapshots to see what changed
- **Restore** — revert a document to any previous snapshot

For `agentBackups`, this means: "I changed my Claude settings 3 days ago and it broke everything — let me revert." Free, built into the CRDT.

For binary files, no merge history — but we keep the previous version's blob for 30 days before cleanup. Each upload creates a new version entry linked to the previous one.

## New Collection Types

### `agentBackups` — Versioned AI config/workspace backup

```typescript
type AgentBackupBase = {
  /** Which agent platform: 'claude-code', 'openclaw', 'cursor', 'copilot', etc. */
  platform: string;
  /** Relative file path within the agent's workspace (e.g. 'skills/eweser-db/SKILL.md') */
  filePath: string;
  /** The file content (text only — binary files use FileAttachment instead) */
  content: string;
  /** MIME type */
  mimeType: string;
  /** SHA-256 of content for change detection */
  contentHash: string;
  /** Source: where this was backed up from (e.g. '~/.claude.json', '/home/user/.openclaw/workspace/') */
  sourcePath?: string;
  /** Tags for organization */
  tags?: string[];
};
```

### `fileAttachments` — Binary file metadata (blob lives in object storage)

```typescript
type FileAttachmentBase = {
  /** SHA-256 content hash — also serves as the storage key */
  fileId: string;
  /** Object storage URL (MinIO/R2 pre-signed or public) */
  url: string;
  /** Non-secret storage provider profile id */
  storageProviderId?: string;
  /** Non-secret object key/path inside the provider bucket */
  objectKey?: string;
  /** MIME type */
  mimeType: string;
  /** Original filename */
  fileName: string;
  /** Size in bytes */
  fileSize: number;
  /** Image dimensions (optional) */
  width?: number;
  height?: number;
  /** Previous version's fileId (for version chain) */
  previousVersionId?: string;
  /** Which room/document this file is attached to (optional) */
  parentRef?: string;
  /** Whether this file is pinned for offline access on this device */
  pinned?: boolean;
};
```

### `syncSettings` — Per-device sync preferences

```typescript
type SyncSettingsBase = {
  /** Device identifier (generated on first run, stored in localStorage) */
  deviceId: string;
  /** Device name (user-editable, e.g. "Jacob's laptop") */
  deviceName: string;
  /** Rooms pinned for offline on this device */
  pinnedRooms: string[];
  /** Individual files pinned for offline */
  pinnedFiles: string[];
  /** Max local cache size in bytes (user-configurable, default 500MB) */
  maxCacheSize: number;
};
```

## Quota Enforcement (eweser.com)

While self-hosting has no limits, the managed service at eweser.com enforces storage quotas for binary files.

- **Text data (Yjs):** Unlimited for all users (notes, conversations, configs, logs).
- **Binary files (Blobs):** Requires a premium plan. Quotas are enforced at the upload API level (`POST /api/files/upload`).
- **Self-hosted:** No enforcement; users manage their own MinIO/S3 storage.
- **Bring-your-own storage:** Eweser should enforce metadata validity and access boundaries, but object byte quotas are the user's provider responsibility unless they opt into hosted storage.

See [monetization.md](../../personal/monetization.md) for the business model and pricing tiers.

## Runs

### Run 1: New collection types in `@eweser/shared`

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Follows existing Note/Flashcard patterns, mechanical type definitions
- [ ] Add `agentBackups` collection type (`packages/shared/src/collections/agent-backup.ts`)
- [ ] Add `fileAttachments` collection type (`packages/shared/src/collections/file-attachment.ts`)
- [ ] Add `syncSettings` collection type (`packages/shared/src/collections/sync-settings.ts`)
- [ ] Export from `packages/shared/src/collections/index.ts`, add to `COLLECTION_KEYS`
- [ ] Files: `packages/shared/src/collections/agent-backup.ts`, `file-attachment.ts`, `sync-settings.ts`, `index.ts`
- [ ] Tests: type shape unit tests
- [ ] **Changeset required** — new public types in `@eweser/shared`

### Run 2: Docker Compose — MinIO service

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Standard MinIO container config, well-documented
- [ ] Add `minio` service to `docker-compose.yml` with health check
- [ ] Add `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD`, `MINIO_BUCKET` to `.env.example`
- [ ] Configure Caddy to proxy `files.localhost` → MinIO API (dev) and block console in prod
- [ ] Add bucket creation init container (runs on first startup via `mc` CLI)
- [ ] Files: `docker-compose.yml`, `.env.example`, `docker/minio/init.sh`

### Run 3: Auth server — File upload/download API

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Auth integration, pre-signed URLs, S3 client, storage quota checks
- [ ] Add `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- [ ] `POST /api/files/upload` — multipart form; validates session; computes SHA-256; streams to MinIO; returns `FileAttachment` metadata
- [ ] `GET /api/files/presign/:fileId` — short-lived pre-signed URL (15 min TTL)
- [ ] `DELETE /api/files/:fileId` — soft-delete (marks deleted, defers MinIO cleanup)
- [ ] `GET /api/files/usage` — returns current storage usage for quota enforcement
- [ ] Upload size limit: configurable, default 100 MB per file
- [ ] Abstract storage backend interface so R2/B2 is a config swap, no code change
- [ ] Env vars: `STORAGE_ENDPOINT`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_PUBLIC_URL`, `STORAGE_QUOTA_MB`
- [ ] Add non-secret provider profile config for hosted, self-hosted MinIO, and bring-your-own S3-compatible endpoints. Provider secrets must come from server env/secret storage or a user-approved local credential store, not synced room data.
- [ ] Files: `packages/auth-server-hono/src/routes/files.ts`, `packages/auth-server-hono/src/lib/storage.ts`
- [ ] Tests: unit tests with MinIO mock; integration test against local MinIO

### Run 4: `@eweser/db` SDK — File + backup helpers

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: IndexedDB caching, hash verification, offline fallback, pin management
- [ ] `uploadFile(file: File, room: Room): Promise<FileAttachment>` — upload, hash, create Yjs metadata doc
- [ ] `getFileUrl(attachment: FileAttachment): Promise<string>` — IndexedDB cache → server fallback, hash verify
- [ ] `pinFile(attachment: FileAttachment): Promise<void>` — cache + mark pinned in `syncSettings`
- [ ] `unpinFile(attachment: FileAttachment): Promise<void>` — remove from pinned, eligible for eviction
- [ ] `getStorageUsage(): { cached: number, pinned: number, total: number }` — local storage stats
- [ ] Content hashing: SHA-256 via Web Crypto API (no extra deps)
- [ ] Files: `packages/db/src/utils/files.ts`, `packages/db/src/index.ts`
- [ ] Tests: vitest unit tests with mock fetch
- [ ] **Changeset required** — new public API in `@eweser/db`

### Run 5: Agent backup CLI / MCP tools

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Core "AI brain" feature — needs file system access, diffing, and careful data handling
- [ ] Add MCP tools to `@eweser/mcp-server`:
  - `eweser_backup_agent_config` — backs up a file/directory to an `agentBackups` room
  - `eweser_restore_agent_config` — restores a backed-up config to the local file system
  - `eweser_list_backups` — list all agent backups, filterable by platform
  - `eweser_diff_backup` — show what changed since last backup (leverages Yjs snapshots)
  - `eweser_search_backups` — full-text search across all agent config backups
- [ ] CLI wrapper (`npx @eweser/mcp-server backup <path>`) for manual/cron use
- [ ] Support for backing up:
  - `~/.claude.json`, `~/.claude/`, `CLAUDE.md` files → platform: `claude-code`
  - `~/.openclaw/workspace-*/skills/` → platform: `openclaw`
  - `~/.cursor/mcp.json`, `.cursorrules` → platform: `cursor`
  - `.vscode/mcp.json`, `.github/copilot-instructions.md` → platform: `copilot`
  - Custom path → platform: `custom`
- [ ] Change detection: only back up if content hash differs from latest version
- [ ] Files: `packages/mcp-server/src/tools/backups.ts`, `packages/mcp-server/src/cli.ts`
- [ ] Tests: unit tests for backup/restore/diff logic

### Run 6: Deployment docs + architecture update

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Documentation only
- [ ] Update `docs/deployment/minimum-specs.md` with AI data layer storage estimates
- [ ] Add `docs/deployment/file-storage.md` — MinIO setup, R2/B2 guide, cost table
- [ ] Update `ARCHITECTURE.md` diagram to include object storage + agent backup flow
- [ ] Document eweser.com free vs. premium tiers
- [ ] Files: `docs/deployment/file-storage.md`, `docs/deployment/minimum-specs.md`, `ARCHITECTURE.md`

## Risks

- **Browser IndexedDB limits**: Varies by browser (50–100 MB typical). Pinned files could exceed this. Mitigation: File System Access API for larger offline stores on desktop; server URL always available as fallback.
- **Upload size limits**: Caddy needs `request_body { max_size 100MB }` in Caddyfile. Document clearly.
- **Agent config sensitivity**: Agent configs may contain API keys or tokens. The MCP backup tool MUST detect and warn about secret-like values (env vars, API keys) before backing up. Option to redact or skip.
- **Obsidian vault sensitivity**: Real Obsidian vaults may contain secrets in Markdown, frontmatter, code blocks, Canvas, Bases, and attachments. Import/sync tooling MUST support local-only inventory, redacted secret findings, skip/redact policies, and explicit approval before writing secret-bearing content into rooms or object storage.
- **Provider credential sensitivity**: Bring-your-own S3/R2/B2 credentials are persistent access credentials. Creating, storing, or changing them requires explicit user confirmation and should use server-side env/secret storage or local OS credential storage, not Yjs.
- **Binary file conflicts**: Two devices can't merge the same image. Last-write-wins or keep-both. Document the limitation clearly.
- **Version history storage growth**: Yjs operation logs grow over time. For long-lived documents, need a compaction/snapshot strategy. Not urgent for v1 (text is small).
- **Changeset required**: `@eweser/shared` and `@eweser/db` both need changeset entries.
- **MinIO security**: Enforce private ACL. Pre-signed URLs with short TTLs (15 min). No public bucket access.

## Execution Summary

```text
Run 1: Collection types in @eweser/shared (Fast)    ← no deps
Run 2: MinIO in Docker Compose (Fast)               ← no deps, parallel with Run 1
    └── Run 3: Auth server file API (Smart)          ← depends on Run 2 + Run 1
        └── Run 4: SDK file + pin helpers (Smart)    ← depends on Run 3 + Run 1
            └── Run 5: Agent backup MCP tools (Smart) ← depends on Run 4 + MCP server (AI-First Run 3)
Run 6: Docs update (Fast)                           ← can run anytime after Run 2
```

Runs 1 and 2 start in parallel. Run 5 depends on the MCP server from the AI-First plan (Run 3 there). Run 6 is independent.

## Status

- [ ] Approved by user
