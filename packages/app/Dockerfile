FROM node:22-slim AS builder

WORKDIR /workspace

# Selective install — only the workspaces needed for the app build
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/app/package.json ./packages/app/

RUN npm ci \
  --workspace @eweser/shared \
  --workspace @eweser/db \
  --workspace @eweser/app \
  --include-workspace-root \
  --ignore-scripts

COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY packages/app/ ./packages/app/

RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db

# Build-time env vars for Vite (passed via Railway service env vars or --build-arg)
ARG VITE_AUTH_SERVER_URL
ARG VITE_AUTH_API_URL
ARG VITE_TURNSTILE_SITE_KEY
RUN cd packages/app && npx vite build

FROM nginx:1.29-alpine

RUN apk add --no-cache gettext

COPY packages/app/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /workspace/packages/app/dist /usr/share/nginx/html

EXPOSE 80

ENV PORT=80
ENV AUTH_API_PROXY_URL=https://auth.eweser.com

CMD ["sh", "-c", "envsubst '${PORT} ${AUTH_API_PROXY_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
