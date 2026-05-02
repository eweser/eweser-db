# EweNotes

A simple note taking app that syncs to the cloud, while also being able to work offline.

Built using [eweser-db](https://github.com/eweser/eweser-db)

## Development Setup

You'll want to either point the app to a Eweser DB instance or run your own instance of the Eweser DB server. You can set the `AUTH_SERVER` environment variable to point to your Eweser DB instance. In local dev, the app defaults to `http://localhost:38180` so the login link reaches the auth UI instead of the API port.

To run your own instance check out the /server readme at [eweser-db repo](https://github.com/eweser/eweser-db)

## Features

- ✓ App layout with sidebar navigation
- ✓ Offline-first — works without login, syncs when connected
- ✓ TipTap editor with Obsidian-style Markdown, slash commands, context menus, and source mode
- ✓ Lossless Obsidian vault import/export contract for comments, embeds, links, callouts, footnotes, properties, tables, and math source
- ✓ Connection status indicator
- ✓ User authentication via `@eweser/db`
- ✓ Real-time sync across devices
- ✓ PWA support for installable experience

## TODO

- [ ] Enhanced user profile management
- [ ] Collaborative cursors for real-time editing
- [ ] Advanced search across notes
