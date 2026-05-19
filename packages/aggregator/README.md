# @eweser/aggregator

Server-side data indexing and search service for EweserDB.

## Overview

The aggregator provides public data access by:

- **Listening to room changes** — Receives signed webhooks from the sync server when documents change
- **Indexing data** — Stores searchable copies only for explicitly public rooms
- **Query API** — Allows apps to search public data without direct room access

## Use Case

When users want to share data publicly (e.g., a blog post, public note, or shared flashcard deck):

1. User marks a room as public (`read` or `write`)
2. Sync tokens carry that explicit publication state to the sync server
3. Aggregator receives webhook notifications on changes and ignores or
   de-indexes private rooms
4. Apps can query the aggregator API to search public content

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp example.env .env
# Configure DATABASE_URL and webhook secrets

# Run migrations
npx drizzle-kit migrate

# Start development server
npm run dev
```

## Docker

```bash
# From repo root
npm run dev:docker
```

## Environment Variables

| Variable         | Required | Description                                |
| ---------------- | -------- | ------------------------------------------ |
| `DATABASE_URL`   | ✅       | PostgreSQL connection string               |
| `WEBHOOK_SECRET` | ✅       | Secret for validating sync server webhooks |
| `PORT`           |          | Server port (default: 8090)                |

## API

- `POST /webhooks/hocuspocus` — Receives signed document change events from sync server
- `GET /api/search?q=<query>` — Searches explicitly indexed public documents
- `GET /health` — Health check

## Related

- `examples/example-aggregator/` — Demo app showing aggregator queries
