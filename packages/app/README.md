# @eweser/app

React SPA for the authenticated Eweser app shell at `app.eweser.com`.

## Overview

This is a standalone Vite + React application that provides authenticated product surfaces:

- **Personal Data Home** — Signed-in landing page
- **Login and signup** — Email/password and OAuth sign-in
- **Connected Apps** — Route shell for app access management
- **MCP / AI Access** — Agent setup and scoped access management
- **Account Security** — Profile, password, email, and 2FA controls

## Tech Stack

- **Build Tool**: Vite
- **Framework**: React 18+
- **Styling**: Tailwind CSS
- **Auth Client**: better-auth client

## Development

```bash
# Install dependencies
npm install

# Set up environment
cp example.env .env

# Start development server
npm run dev
```

## Environment Variables

| Variable                  | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| `VITE_AUTH_SERVER_URL`    | URL of the auth API server                                |
| `VITE_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile site key for signup captcha |

## Docker

Served as a static site. The production app is intended to live at the root of `app.eweser.com`.

## Related Packages

- `@eweser/auth-server-hono` — Backend API this UI connects to
