FROM node:22-slim AS builder

WORKDIR /workspace

# Selective install — only the workspaces needed for the auth-pages build
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY packages/auth-pages/package.json ./packages/auth-pages/

RUN npm ci \
  --workspace @eweser/shared \
  --workspace @eweser/db \
  --workspace @eweser/auth-pages \
  --include-workspace-root

COPY packages/shared/ ./packages/shared/
COPY packages/db/ ./packages/db/
COPY packages/auth-pages/ ./packages/auth-pages/

RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db

# Build-time env vars for Vite (passed via Railway service env vars or --build-arg)
ARG VITE_AUTH_SERVER_URL
ARG VITE_AUTH_API_URL
RUN cd packages/auth-pages && npx vite build

FROM nginx:1.29-alpine

RUN apk add --no-cache gettext

COPY packages/auth-pages/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /workspace/packages/auth-pages/dist /usr/share/nginx/html/auth

EXPOSE 80

ENV PORT=80

CMD ["sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]