FROM node:22-slim AS builder

RUN apt-get update \
	&& apt-get install -y --no-install-recommends git \
	&& rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_FACTOR=2
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

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

WORKDIR /workspace

RUN apt-get update \
	&& apt-get install -y --no-install-recommends git \
	&& rm -rf /var/lib/apt/lists/*

ENV NPM_CONFIG_FETCH_RETRIES=5
ENV NPM_CONFIG_FETCH_RETRY_FACTOR=2
ENV NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000
ENV NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000
ENV NPM_CONFIG_IGNORE_SCRIPTS=true

# Copy package manifests and lockfile for production install
COPY --from=builder /workspace/package.json /workspace/package-lock.json ./
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/
COPY --from=builder /workspace/packages/logger/package.json ./packages/logger/
COPY --from=builder /workspace/packages/sync-server/package.json ./packages/sync-server/

# Install only production deps
RUN npm ci --workspace @eweser/shared --workspace @eweser/logger --workspace @eweser/sync-server --include-workspace-root --omit=dev
RUN npm_config_ignore_scripts=false npm rebuild sqlite3 --workspace @eweser/sync-server

# Copy built dist files
COPY --from=builder /workspace/packages/sync-server/dist ./packages/sync-server/dist
COPY --from=builder /workspace/packages/logger/dist ./packages/logger/dist
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist

# SQLite data directory
RUN mkdir -p /data

ENV PORT=8080
ENV SYNC_PORT=8080
ENV SYNC_DB_PATH=/data/sync.sqlite
EXPOSE 8080

CMD ["node", "packages/sync-server/dist/index.js"]
