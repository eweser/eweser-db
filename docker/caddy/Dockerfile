FROM node:22 AS builder

ARG PUBLIC_ORIGIN=http://localhost:38180

WORKDIR /workspace

COPY . .

RUN npm ci
RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db
RUN npm run build --workspace @eweser/examples-components
RUN npm run build --workspace @eweser/auth-pages
RUN npm run build --workspace @eweser/ewe-note
RUN VITE_AUTH_SERVER=${PUBLIC_ORIGIN} npm run build --workspace @eweser/example-basic

FROM caddy:2.10-alpine

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /workspace/packages/auth-pages/dist /srv/auth-pages
COPY --from=builder /workspace/packages/ewe-note/dist /srv/ewe-note
COPY --from=builder /workspace/examples/example-basic/dist /srv/app
