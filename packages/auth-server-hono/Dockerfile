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

# Keep workspace structure so node can resolve @eweser/* symlinks from root node_modules
WORKDIR /workspace

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/auth-server-hono/dist ./packages/auth-server-hono/dist
COPY --from=builder /workspace/packages/auth-server-hono/drizzle ./packages/auth-server-hono/drizzle
COPY --from=builder /workspace/packages/auth-server-hono/package.json ./packages/auth-server-hono/
# Workspace packages used as deps (resolved via node_modules symlinks)
COPY --from=builder /workspace/packages/logger/dist ./packages/logger/dist
COPY --from=builder /workspace/packages/logger/package.json ./packages/logger/
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/
COPY --from=builder /workspace/packages/mcp-server/dist ./packages/mcp-server/dist
COPY --from=builder /workspace/packages/mcp-server/package.json ./packages/mcp-server/

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node packages/auth-server-hono/dist/db/migrate.js && node packages/auth-server-hono/dist/index.js"]
