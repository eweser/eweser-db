FROM node:22 AS builder

WORKDIR /workspace

COPY . .

RUN npm ci
RUN npm run build --workspace @eweser/shared
RUN npm run build --workspace @eweser/db
RUN cd packages/ewe-note && npx vite build

FROM nginx:1.29-alpine

COPY packages/ewe-note/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /workspace/packages/ewe-note/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
