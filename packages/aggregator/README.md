# @eweser/aggregator

Server-side data indexing and search service for EweserDB.

## Overview

The aggregator provides public data access by:

- **Listening to room changes** — Receives webhooks from the sync server when documents change
- **Indexing data** — Stores searchable copies of public/shared documents
- **Query API** — Allows apps to search public data without direct room access

## Use Case

When users want to share data publicly (e.g., a blog post, public note, or shared flashcard deck):

1. User invites the aggregator to their room
2. Aggregator receives webhook notifications on changes
3. Data is indexed in PostgreSQL
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

- `POST /webhook` — Receives document change events from sync server
- `GET /health` — Health check

## Related

- `examples/example-aggregator/` — Demo app showing aggregator queries
