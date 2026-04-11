FROM node:22 AS builder

WORKDIR /workspace

COPY . .

RUN npm ci
RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db

# Build-time env vars for Vite (passed via Railway service env vars or --build-arg)
ARG VITE_AUTH_SERVER
RUN cd packages/ewe-note && npx vite build

FROM nginx:1.29-alpine

RUN apk add --no-cache gettext

COPY packages/ewe-note/nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /workspace/packages/ewe-note/dist /usr/share/nginx/html

EXPOSE 80

ENV PORT=80

CMD ["sh", "-c", "envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
