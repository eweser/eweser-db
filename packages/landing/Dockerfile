# Build stage
FROM node:20-alpine AS build
WORKDIR /app

# Copy workspace root (needed for npm workspaces resolution)
COPY package.json package-lock.json ./
COPY packages/landing/package.json ./packages/landing/

RUN npm ci --workspace=packages/landing --include-workspace-root

COPY packages/landing ./packages/landing

RUN npm run build --workspace=packages/landing

# Serve stage — static nginx
FROM nginx:1.27-alpine AS serve
COPY --from=build /app/packages/landing/dist /usr/share/nginx/html
COPY packages/landing/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
