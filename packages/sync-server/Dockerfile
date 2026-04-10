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

WORKDIR /app
COPY --from=builder /workspace/packages/sync-server/dist ./dist
COPY --from=builder /workspace/packages/sync-server/node_modules ./node_modules
COPY --from=builder /workspace/packages/sync-server/package.json ./

# SQLite data directory
RUN mkdir -p /data

ENV SYNC_PORT=8080
ENV SYNC_DB_PATH=/data/sync.sqlite
EXPOSE 8080

CMD ["node", "dist/index.js"]
