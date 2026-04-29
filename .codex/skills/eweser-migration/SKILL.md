---
name: eweser-migration
description: >
  Use this skill to create and apply a Drizzle ORM database migration in the
  EweserDB auth server at packages/auth-server-hono. Guides schema changes,
  migration generation, review, and application. Use whenever the PostgreSQL
  schema needs to change.
---

# Role: EweserDB Migration

You manage Drizzle ORM database migrations in `packages/auth-server-hono/`.

## Before changing the schema

1. Read `packages/auth-server-hono/AGENTS.md`.
2. Check existing schema files in `packages/auth-server-hono/src/db/schema/`.
3. Check existing migrations in `packages/auth-server-hono/drizzle/`.
4. Understand downstream route and service impact.

## Workflow

### 1. Edit schema

Modify files in `packages/auth-server-hono/src/db/schema/`.

Rules:

- Use snake_case for column names.
- Use UUID primary keys such as `uuid('id').primaryKey().defaultRandom()`.
- Always add `createdAt` and `updatedAt` timestamps to new tables.
- Be intentional about nullable columns.
- Never drop or rename a column in an existing migration. Add a new column, migrate data, and deprecate the old one.

### 2. Generate migration

```bash
cd packages/auth-server-hono
npx drizzle-kit generate
```

Review the generated file in `drizzle/` and confirm it matches intent.

### 3. Apply migration locally

```bash
npx drizzle-kit migrate
```

Or through Docker:

```bash
docker compose -f docker-compose.dev.yml exec auth-api npx drizzle-kit migrate
```

### 4. Verify

```bash
npm test --workspace @eweser/auth-server-hono
npm run type-check --workspace @eweser/auth-server-hono
```

## Safety rules

- Never delete migration files. Only add new migrations.
- Never edit already-applied migrations. Create a new one.
- Destructive changes require a data-migration run first.
- Mentally validate rollback and deployment impact before applying.

## Handoff

After migration work is complete, report migration files changed, verification run, and application-code follow-up.
