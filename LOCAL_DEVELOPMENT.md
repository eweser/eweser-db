# Local Development Setup

This guide will help you set up a local development environment for eweser-db.

## Prerequisites

### Required Software

1. **Node.js** (v20.11.0)
   - This project uses [Volta](https://volta.sh/) for Node version management
   - Volta will automatically use the correct version specified in `package.json`
   - Alternatively, install Node.js 20.11.0 manually

2. **Docker Desktop**
   - Required for running Supabase locally
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/)
   - Make sure Docker is running before starting development

3. **Git**
   - For cloning the repository

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/eweser/eweser-db.git
cd eweser-db
```

### 2. Install Dependencies

This is a monorepo using npm workspaces. Install all dependencies from the root:

```bash
npm install
```

This will install dependencies for all packages and examples in the workspace.

### 3. Set Up Supabase (Local Development)

The auth-server package uses Supabase for authentication and database management.

#### Start Supabase

Make sure Docker is running, then:

```bash
cd packages/auth-server
npx supabase start
```

This command will:

- Pull the necessary Docker images
- Start the Supabase stack locally (PostgreSQL, Auth, Storage, etc.)
- Display connection details including:
  - API URL (usually `http://127.0.0.1:54321`)
  - Database URL
  - Studio URL (Supabase Dashboard)
  - Anon Key
  - Service Role Key

**Note:** The first time you run this, it may take several minutes to download the Docker images.

#### Configure Environment Variables

1. Copy the example environment file:

```bash
cp example.env .env.local
```

2. Update `.env.local` with the connection details from `supabase start`:

```bash
# Supabase local dev
NEXT_PUBLIC_SUPABASE_URL='http://127.0.0.1:54321'
NEXT_PUBLIC_SUPABASE_ANON_KEY='<your-anon-key-from-supabase-start>'
SUPABASE_CONNECTION_URL='postgresql://postgres:postgres@127.0.0.1:54322/postgres'
SUPABASE_SERVICE_ROLE_KEY='<your-service-role-key-from-supabase-start>'

# Local auth server
NEXT_PUBLIC_AUTH_SERVER_URL='http://localhost:38100'
NEXT_PUBLIC_AUTH_SERVER_DOMAIN='localhost:38100'

# Server secret (can be any random string)
SERVER_SECRET='any-random-string-for-local-dev'

# Y-Sweet connection (see Y-Sweet section below)
Y_SWEET_CONNECTION_STRING=yss://asdf.asdf-asdf@y-sweet.net/p/asdf--asdf/
```

#### Access Supabase Studio

Once Supabase is running, you can access the Supabase Studio (local dashboard) at:

```
http://127.0.0.1:54323
```

This provides a UI for:

- Viewing/editing database tables
- Managing authentication
- Viewing API logs
- Testing SQL queries

### 4. Set Up Y-Sweet

Y-Sweet is used for real-time CRDT synchronization.

#### Option 1: Use Hosted Y-Sweet (Recommended for Development)

1. Sign up at [JamSocket](https://jamsocket.com/)
2. Follow their [Quick Start Guide](https://docs.jamsocket.com/y-sweet/quickstart) to generate a connection string
3. Add the connection string to your `.env.local`:

```bash
Y_SWEET_CONNECTION_STRING=yss://your-connection-string@y-sweet.net/p/your-project/
```

#### Option 2: Self-Host Y-Sweet (Advanced)

Follow the Y-Sweet self-hosting documentation. You'll need to set up your own Y-Sweet instance and configure the connection string accordingly.

## Running the Development Environment

### Run Everything at Once

From the root directory, run all development servers:

```bash
npm run dev
```

This will start:

- `packages/db` - The core database library (watch mode)
- `packages/shared` - Shared utilities (watch mode)
- `packages/auth-server` - Auth server at `http://localhost:38100`
- `packages/aggregator` - Search/indexing service at `http://localhost:8090`
- `examples/example-basic` - Example app at `http://localhost:38110`
- `packages/examples-components` - UI components (watch mode)

Alternatively, use the VS Code tasks (Command Palette → "Tasks: Run Task" → "Run All Dev")

The Docker Compose stack is served behind Caddy at `http://localhost:38180`.

You can override the defaults with environment variables:

- `AUTH_SERVER_PORT` — legacy Next auth server dev/start port. Default: `38100`
- `AUTH_API_PORT` — standalone Hono auth API port. Default: `38101`
- `AGGREGATOR_WEBHOOK_URL` — sync-server webhook target for aggregator indexing. Default in Docker Compose: `http://aggregator:8090/webhooks/hocuspocus`
- `EXAMPLE_BASIC_PORT` — example-basic Vite dev/preview port and Cypress default target. Default: `38110`
- `CADDY_HOST_PORT` — Docker Compose host port for the full stack. Default: `38180`
- `AUTH_PUBLIC_URL`, `AUTH_PUBLIC_DOMAIN`, `SYNC_PUBLIC_URL` — full-stack public URLs used by Docker Compose

### Run Individual Packages

You can also run packages individually:

```bash
# Auth server only
npm run dev:auth-server
# or
cd packages/auth-server && npm run dev

# Example app only
npm run dev:example-basic
# or
cd examples/example-basic && npm run dev

# Database library (watch mode)
npm run dev:db
# or
cd packages/db && npm run dev

# Aggregator service
npm run dev:aggregator
# or
cd packages/aggregator && npm run dev
```

## Development Workflow

### Project Structure

- `packages/db` - Core database library
- `packages/auth-server` - Next.js authentication server
- `packages/shared` - Shared types and utilities
- `packages/examples-components` - Reusable UI components
- `examples/example-basic` - Basic example application
- `examples/react-native` - React Native example

### Making Changes

1. Make changes to the code in any package
2. The dev servers will automatically rebuild and hot-reload
3. Test your changes in the example apps

### Database Migrations

If you need to modify the database schema:

```bash
cd packages/auth-server
npx supabase migration new <migration_name>
```

Edit the generated migration file in `packages/auth-server/supabase/migrations/`, then apply it:

```bash
npx supabase db reset  # Resets local DB and applies all migrations
```

## Code Quality

Before committing, run the quality check command to verify linting, formatting, type-safety, and tests:

```bash
npm run check
```

This command runs all quality gates in order:

- Linting (ESLint)
- Format check (Prettier)
- Type-check (TypeScript)
- Unit tests (Vitest)

To fix formatting and lint issues automatically:

```bash
npm run lint:fix
npm run format
```

For details on quality gate requirements per package, see [Quality Gates Matrix](docs/ai/quality-gates-matrix.md).

## Testing

### Unit Tests

The database package has unit tests. To run them:

```bash
npm run test:db
```

### End-to-End Tests

Run E2E tests with Cypress:

```bash
# Headless mode (runs once)
npm run test:e2e

# Interactive mode (opens Cypress GUI)
npm run dev-e2e
```

**Note:** Make sure the development servers are running before running E2E tests.

## Common Issues

### Port Already in Use

If you see port conflict errors:

- Check if another service is using ports 38100, 38110, 54321, 54322, or 54323
- Stop the conflicting service or change the port in the configuration

### Supabase Won't Start

- Make sure Docker is running
- Try stopping and removing existing containers: `npx supabase stop --no-backup`
- Then start again: `npx supabase start`

### "Too Many Event Listeners" Error

This happens when too many rooms are connected simultaneously. Use `db.disconnectRoom()` to disconnect from rooms when they're not needed (current limit is 100 rooms).

## Stopping Services

### Stop Development Servers

Press `Ctrl+C` in the terminal running the dev servers.

### Stop Supabase

```bash
cd packages/auth-server
npx supabase stop
```

Add `--no-backup` flag to also remove the database data:

```bash
npx supabase stop --no-backup
```

## Building for Production

### Build All Packages

```bash
npm run build
```

This builds all packages and examples in the correct order.

### Build Individual Packages

```bash
npm run build-db
npm run build-auth-server
npm run build-shared
npm run build-components
npm run build-examples
```

## Additional Resources

- [Main README](./README.md) - Project overview and features
- [Auth Server README](./packages/auth-server/README.md) - Deployment and production setup
- [Supabase Documentation](https://supabase.com/docs)
- [Y-Sweet Documentation](https://docs.jamsocket.com/y-sweet)
- [Yjs Documentation](https://docs.yjs.dev/)

## Getting Help

- Open an issue on [GitHub](https://github.com/eweser/eweser-db/issues)
- Check existing issues for solutions
- Review the example apps for implementation patterns
