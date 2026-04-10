FROM node:22-slim AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/logger/package.json ./packages/logger/
COPY packages/sync-server/package.json ./packages/sync-server/

RUN npm ci --workspace @eweser/shared --workspace @eweser/logger --workspace @eweser/sync-server --include-workspace-root

COPY packages/shared/ ./packages/shared/
COPY packages/logger/ ./packages/logger/
COPY packages/sync-server/ ./packages/sync-server/

RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/logger
RUN npm run build --workspace @eweser/sync-server

FROM node:22-slim

# Keep workspace structure so node can resolve @eweser/* symlinks from root node_modules
WORKDIR /workspace

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/sync-server/dist ./packages/sync-server/dist
COPY --from=builder /workspace/packages/sync-server/package.json ./packages/sync-server/
# Workspace packages used as deps (resolved via node_modules symlinks)
COPY --from=builder /workspace/packages/logger/dist ./packages/logger/dist
COPY --from=builder /workspace/packages/logger/package.json ./packages/logger/
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/

# SQLite data directory
RUN mkdir -p /data

ENV SYNC_PORT=8080
ENV SYNC_DB_PATH=/data/sync.sqlite
EXPOSE 8080

CMD ["node", "packages/sync-server/dist/index.js"]
