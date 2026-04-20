# @eweser/auth-pages

React SPA for authentication pages (login, signup, account management).

## Overview

This is a standalone Vite + React application that provides the UI for the auth server:

- **Login page** — Email/password and OAuth sign-in
- **Signup page** — New user registration
- **Account management** — Profile, password change, connected accounts
- **Forgot password** — Password reset flow

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

| Variable               | Description                |
| ---------------------- | -------------------------- |
| `VITE_AUTH_SERVER_URL` | URL of the auth API server |
| `VITE_TURNSTILE_SITE_KEY` | Optional Cloudflare Turnstile site key for signup captcha |

## Docker

Served as a static site via Docker Compose. The Caddy reverse proxy routes auth-related paths to this service.

## Related Packages

- `@eweser/auth-server-hono` — Backend API this UI connects to
