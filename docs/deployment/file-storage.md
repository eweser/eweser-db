# File Storage

EweserDB file attachments use an operator-configured S3-compatible provider.
Credentials stay in the auth server environment and are never written to room
documents, API responses, screenshots, or synced user data.

## Provider Profiles

The current implementation exposes one default provider profile:

- `STORAGE_PROVIDER_PROFILE_ID`: profile id shown to users and stored on
  attachment metadata. Defaults to `railway-buckets`.
- `STORAGE_S3_ENDPOINT`: S3-compatible endpoint URL.
- `STORAGE_S3_REGION`: provider region, or `auto` when the provider expects it.
- `STORAGE_S3_BUCKET`: bucket name.
- `STORAGE_S3_ACCESS_KEY_ID`: server-side access key id.
- `STORAGE_S3_SECRET_ACCESS_KEY`: server-side secret access key.
- `STORAGE_S3_FORCE_PATH_STYLE`: `true` for providers that require path-style
  URLs.
- `STORAGE_MAX_FILE_SIZE_MB`: upload size limit, default `100`.

The auth app and `/api/files/provider-profile` expose only secret-safe metadata:
profile id, provider kind, configured state, endpoint, bucket, region,
path-style mode, and max file size. They do not expose access keys or secret
keys.

## Railway Buckets

Use a Railway Bucket or any S3-compatible bucket by mapping Railway's generated
S3 variables to the `STORAGE_S3_*` variables on the `auth-api` service. Keep the
bucket private; downloads are served through short-lived presigned URLs.

## Self-Hosted S3-Compatible Storage

For MinIO or another S3-compatible provider:

```env
STORAGE_PROVIDER_PROFILE_ID=self-hosted-s3
STORAGE_S3_ENDPOINT=https://storage.example.com
STORAGE_S3_REGION=auto
STORAGE_S3_BUCKET=eweser-files
STORAGE_S3_ACCESS_KEY_ID=<server-side-key-id>
STORAGE_S3_SECRET_ACCESS_KEY=<server-side-secret-key>
STORAGE_S3_FORCE_PATH_STYLE=true
STORAGE_MAX_FILE_SIZE_MB=100
```

Do not commit these values. Put them in the deployment environment or ignored
local `.env` files only.

## BYO Provider Status

User-submitted S3 credentials are intentionally not stored in PostgreSQL or
EweserDB room data in this run. BYO storage can be represented by a different
operator-configured profile id, but accepting end-user credentials needs a
separate approved secret-storage design.

## Local Cache And Pinning

The SDK verifies downloaded bytes against `contentHash` before marking a file
available in the local IndexedDB cache. Apps can pin or unpin cached files with
the exported file helpers. Pinned files remain device-local; they are not a
server backup and should still be treated as plaintext on that device.

## User Snapshot Backups

Database snapshots use the same configured provider profile, but they are stored
under the `backups/<user-id>/...` object prefix instead of the attachment room
prefix. Snapshot object keys and metadata are recorded in auth-server
PostgreSQL so the account app can list and download saved snapshots without
exposing provider credentials.

The v1 SDK snapshot bundle is normalized JSON with one room entry per selected
room. Each room includes exported documents for dry-run conflict reporting and a
base64 Yjs update for future full-fidelity restore paths. The current restore
helper writes normalized documents with CRDT-safe operations and defaults to
keep-both conflict handling.

Snapshot retention is metadata-only. The upload route stores a default retention
expiry for operator visibility, but no route or scheduled job deletes user
snapshots automatically without a separate explicit retention policy.
