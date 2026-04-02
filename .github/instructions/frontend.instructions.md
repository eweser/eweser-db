---
applyTo: "packages/ewe-note/**,examples/**,packages/examples-components/**"
---

# Frontend & Apps Instructions

## Stack

- React 18-19, Vite, Tailwind CSS, Radix UI
- BlockNote editor (in ewe-note)
- `@eweser/db` for data layer
- `@eweser/examples-components` for shared UI

## Patterns

- Apps are Vite-powered React SPAs
- Use `@eweser/db` Database class for all data operations
- Connect to auth server via env var (`AUTH_SERVER` or similar)
- Handle offline state gracefully — local-first means the app works without network

## Component Library (`examples-components`)

- Shared UI components used across example apps
- Exports ESM + UMD + CSS
- Peer depends on `@eweser/db` and React
- Changes require changeset: `npm run changeset`

## Development

- `npm run dev` from package dir, or `npm run dev` from root for all
- Hot reload via Vite
