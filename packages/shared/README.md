# @eweser/shared

Shared types, utilities, and constants for the EweserDB ecosystem.

## Overview

This package contains:

- **TypeScript types** — Core interfaces and type definitions
- **Schema definitions** — Document and collection schemas
- **API types** — Shared request/response types for auth and sync
- **Utility functions** — Pure helper functions used across packages

## Key Exports

### Types

- `CollectionKey` — Valid collection identifiers (notes, flashcards, etc.)
- `DocumentBase` — Base interface for all documents
- `Room` — Room/folder structure
- `User` — User profile type

### Schemas

- Collection definitions in `collections/` folder
- Document CRUD helpers

### API Types

- Auth server request/response types
- Sync server token types

## Usage

```typescript
import type { Note, Room } from '@eweser/shared';
import { collectionKeys } from '@eweser/shared';
```

## Design Principles

- **Zero runtime dependencies** — This package has no dependencies
- **Pure types and utilities** — No side effects, no DOM, no Node APIs
- **Changes affect all consumers** — Rebuild after changes: `npm run build`

## Related Packages

- `@eweser/db` — Core SDK (depends on this package)
- All other packages import types from here
