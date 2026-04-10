#!/bin/bash
# Simple deployment script for Digital Ocean VPS
# Builds and starts services one at a time to avoid resource issues

set -e

cd /opt/eweser-db

echo "=== EweserDB Deployment ==="

# Stop any running containers
echo "Stopping existing containers..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

# Clean up
echo "Cleaning up Docker..."
docker system prune -f 2>/dev/null || true

# Start postgres first (no build needed)
echo "Starting PostgreSQL..."
docker compose -f docker-compose.prod.yml up -d postgres

# Wait for postgres to be healthy
echo "Waiting for PostgreSQL to be healthy..."
sleep 10

# Build and start sync-server
echo "Building sync-server..."
docker build -f packages/sync-server/Dockerfile -t eweser-db-sync-server:latest .

echo "Building sync-server-2..."
docker build -f packages/sync-server/Dockerfile -t eweser-db-sync-server-2:latest .

echo "Building aggregator..."
docker build -f packages/aggregator/Dockerfile -t eweser-db-aggregator:latest .

echo "Building auth-api..."
docker build -f packages/auth-server-hono/Dockerfile -t eweser-db-auth-api:latest .

echo "Building ewe-note..."
docker build -f packages/ewe-note/Dockerfile -t eweser-db-ewe-note:latest .

echo "Building caddy..."
docker build -f docker/caddy/Dockerfile -t eweser-db-caddy:latest .

echo "Starting all services..."
docker compose -f docker-compose.prod.yml up -d

echo "=== Deployment Complete ==="
echo "Check status with: docker compose -f docker-compose.prod.yml ps"
echo "View logs with: docker compose -f docker-compose.prod.yml logs -f"
