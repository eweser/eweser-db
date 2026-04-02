FROM node:22-slim AS builder

WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-slim

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# SQLite data directory
RUN mkdir -p /data

ENV SYNC_PORT=8080
ENV SYNC_DB_PATH=/data/sync.sqlite
EXPOSE 8080

CMD ["node", "dist/index.js"]
