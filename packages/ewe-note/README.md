# EweNote

Calm local-first notes with TipTap editing, Obsidian-style Markdown
preservation, folders, links, metadata, and optional EweserDB sync.

Built using [eweser-db](https://github.com/eweser/eweser-db)

## Development Setup

For local UI work:

```bash
VITE_AUTH_SERVER=http://localhost:38101 VITE_AUTH_PAGES_URL=http://localhost:3001 npm run dev --workspace @eweser/ewe-note -- --host 127.0.0.1 --port 5181
```

Point `VITE_AUTH_SERVER` and `VITE_AUTH_PAGES_URL` at the local or deployed
EweserDB auth services you want to test. Without auth/sync services, the app
still writes local notes in the browser profile.

To run your own instance check out the /server readme at [eweser-db repo](https://github.com/eweser/eweser-db)

## Features

- ✓ App layout with sidebar navigation
- ✓ Offline-first — works without login, syncs when connected
- ✓ TipTap editor with Obsidian-style Markdown, slash commands, context menus, and source mode
- ✓ Lossless Obsidian vault import/export contract for comments, embeds, links, callouts, footnotes, properties, tables, and math source
- ✓ Local/auth/sync status indicator
- ✓ User authentication via `@eweser/db`
- ✓ Optional room sync when auth and sync services are reachable
- ✓ PWA install support in production builds

## TODO

- [ ] Enhanced user profile management
- [ ] Collaborative cursors for real-time editing
- [ ] Advanced search across notes
- [ ] UI-level vault import/export workflow
