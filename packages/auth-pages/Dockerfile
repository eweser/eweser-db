FROM node:22-slim AS builder

WORKDIR /workspace

COPY . .

RUN npm ci

RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db
RUN npm run build --workspace @eweser/auth-pages

FROM nginx:1.29-alpine

COPY packages/auth-pages/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/packages/auth-pages/dist /usr/share/nginx/html/auth

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]