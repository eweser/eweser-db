FROM node:22 AS builder

ARG PUBLIC_ORIGIN=http://localhost:38180

WORKDIR /workspace

COPY . .

RUN npm ci
RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db
RUN npm run build --workspace @eweser/examples-components
RUN npm run build --workspace @eweser/app
RUN npm run build --workspace @eweser/landing

FROM caddy:2.10-alpine

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /workspace/packages/app/dist /srv/app
COPY --from=builder /workspace/packages/landing/dist /srv/landing
