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

# Keep workspace structure so node can resolve @eweser/* symlinks from root node_modules
WORKDIR /workspace

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/packages/aggregator/dist ./packages/aggregator/dist
COPY --from=builder /workspace/packages/aggregator/package.json ./packages/aggregator/
# Workspace packages used as deps (resolved via node_modules symlinks)
COPY --from=builder /workspace/packages/logger/dist ./packages/logger/dist
COPY --from=builder /workspace/packages/logger/package.json ./packages/logger/
COPY --from=builder /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=builder /workspace/packages/shared/package.json ./packages/shared/

ENV PORT=8090
EXPOSE 8090

CMD ["node", "packages/aggregator/dist/index.js"]
