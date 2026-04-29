# Plan: Big Refactor - Remove Next.js + Supabase, Docker Compose Everything

> **Created:** 2026-04-02
> **Status:** Historical migration plan. The auth cutover described here is already reflected in the current repository.

## Summary

This plan captured the migration from Next.js + Supabase to the current Hono + better-auth auth stack, plus the Docker Compose-based backend layout.

## What Matters Today

- `packages/auth-server-hono/` is the current auth API.
- `packages/auth-pages/` is the auth UI SPA.
- `docker-compose.dev.yml` runs the backend stack locally.
- `docker-compose.prod.yml` adds Caddy and the frontend containers for the full stack.

## Historical Notes

- The original plan also discussed removing old compatibility paths such as `y-webrtc` from `@eweser/db`, but that dependency is still present in the current source tree.
- Any deployment or mobile follow-up items from the original plan should be treated as historical context unless a newer plan or ADR supersedes them.
