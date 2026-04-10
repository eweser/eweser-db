FROM node:22-slim AS builder

WORKDIR /workspace

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/logger/package.json ./packages/logger/
COPY packages/aggregator/package.json ./packages/aggregator/

RUN npm ci --workspace @eweser/shared --workspace @eweser/logger --workspace @eweser/aggregator --include-workspace-root

COPY packages/shared/ ./packages/shared/
COPY packages/logger/ ./packages/logger/
COPY packages/aggregator/ ./packages/aggregator/

RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/logger
RUN npm run build --workspace @eweser/aggregator

FROM node:22-slim

WORKDIR /workspace

# Copy package manifests and lockfile for production install
COPY --from=builder /workspace/package.json /workspace/package-lock.json ./
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/
COPY --from=builder /workspace/packages/logger/package.json ./packages/logger/
COPY --from=builder /workspace/packages/aggregator/package.json ./packages/aggregator/

# Install only production deps (properly sets up workspace symlinks)
RUN npm ci --workspace @eweser/shared --workspace @eweser/logger --workspace @eweser/aggregator --include-workspace-root --omit=dev

# Copy built dist files
COPY --from=builder /workspace/packages/aggregator/dist ./packages/aggregator/dist
COPY --from=builder /workspace/packages/logger/dist ./packages/logger/dist
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist

ENV PORT=8090
EXPOSE 8090

CMD ["node", "packages/aggregator/dist/index.js"]

