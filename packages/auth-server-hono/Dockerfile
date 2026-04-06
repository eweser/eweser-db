FROM node:22-slim AS shared-builder

WORKDIR /workspace/packages/shared

COPY packages/shared/package.json ./package.json
COPY packages/shared/tsconfig.json ./tsconfig.json
COPY packages/shared/src ./src

RUN npm install --ignore-scripts
RUN npm run build

FROM node:22-slim AS auth-builder

WORKDIR /workspace/packages/auth-server-hono

COPY packages/auth-server-hono/package.json ./package.json
COPY packages/auth-server-hono/tsconfig.json ./tsconfig.json
COPY packages/auth-server-hono/drizzle.config.ts ./drizzle.config.ts
COPY packages/auth-server-hono/src ./src
COPY packages/auth-server-hono/drizzle ./drizzle

RUN npm install --ignore-scripts
COPY --from=shared-builder /workspace/packages/shared /workspace/packages/shared
RUN npm install --ignore-scripts /workspace/packages/shared
RUN npm run build

FROM node:22-slim

WORKDIR /app

COPY --from=auth-builder /workspace/packages/auth-server-hono/package.json ./package.json
COPY --from=auth-builder /workspace/packages/auth-server-hono/node_modules ./node_modules
COPY --from=auth-builder /workspace/packages/auth-server-hono/dist ./dist
COPY --from=auth-builder /workspace/packages/auth-server-hono/drizzle ./drizzle

ENV PORT=3000
EXPOSE 3000

CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
