FROM node:22-slim AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/logger/package.json ./packages/logger/
COPY packages/mcp-server/package.json ./packages/mcp-server/
COPY packages/auth-server-hono/package.json ./packages/auth-server-hono/

RUN npm ci \
  --workspace @eweser/shared \
  --workspace @eweser/logger \
  --workspace @eweser/mcp \
  --workspace @eweser/auth-server-hono \
  --include-workspace-root

COPY packages/shared/ ./packages/shared/
COPY packages/logger/ ./packages/logger/
COPY packages/mcp-server/ ./packages/mcp-server/
COPY packages/auth-server-hono/ ./packages/auth-server-hono/

RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/logger
RUN npm run build --workspace @eweser/mcp
RUN npm run build --workspace @eweser/auth-server-hono

FROM node:22-slim

WORKDIR /app

COPY --from=builder /workspace/packages/auth-server-hono/dist ./dist
COPY --from=builder /workspace/packages/auth-server-hono/drizzle ./drizzle
COPY --from=builder /workspace/packages/auth-server-hono/node_modules ./node_modules
COPY --from=builder /workspace/packages/auth-server-hono/package.json ./

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
