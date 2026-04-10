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

WORKDIR /app
COPY --from=builder /workspace/packages/aggregator/dist ./dist
COPY --from=builder /workspace/packages/aggregator/node_modules ./node_modules
COPY --from=builder /workspace/packages/aggregator/package.json ./

ENV PORT=8090
EXPOSE 8090

CMD ["node", "dist/index.js"]
