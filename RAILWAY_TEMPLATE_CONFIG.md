# Railway Template Environment Variables

Copy-paste these into each service's environment variables in the Railway template editor.

## auth-api

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SERVER_SECRET=${{secret}}
BETTER_AUTH_SECRET=${{secret}}
SYNC_AUTH_SECRET=${{secret}}
BETTER_AUTH_BASE_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_SERVER_DOMAIN=${{RAILWAY_PUBLIC_DOMAIN}}
AUTH_SERVER_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
SYNC_SERVER_URL=wss://sync-server-${{RAILWAY_PUBLIC_DOMAIN}}
PORT=3000
```

## sync-server

```env
SYNC_AUTH_SECRET=${{auth-api.SYNC_AUTH_SECRET}}
AGGREGATOR_WEBHOOK_URL=https://aggregator-${{RAILWAY_PUBLIC_DOMAIN}}/webhooks/hocuspocus
WEBHOOK_SECRET=${{secret}}
PORT=8080
```

## aggregator

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
SYNC_SERVER_URL=wss://sync-server-${{RAILWAY_PUBLIC_DOMAIN}}
SYNC_AUTH_SECRET=${{auth-api.SYNC_AUTH_SECRET}}
WEBHOOK_SECRET=${{sync-server.WEBHOOK_SECRET}}
PORT=3001
```

## ewe-note

No environment variables needed.

## auth-pages

No environment variables needed.

## Postgres

Use Railway's default PostgreSQL template or set:

```env
POSTGRES_DB=eweser
POSTGRES_USER=eweser
POSTGRES_PASSWORD=${{secret}}
```

---

## Template Setup Steps

1. **Remove `landing` service** (click X on the card)
2. **Click each service** → **Variables** → **Edit Raw** → Paste the env vars above
3. **For secrets**: Use the `${{secret}}` placeholder - Railway will auto-generate
4. **For service references**: Use `${{service.VARIABLE}}` syntax
5. **Click Save**
6. **Click Publish**
7. **Copy the template code** (e.g., `a1b2c3d4`)
8. **Update README.md**:
   ```markdown
   [![Deploy on Railway](https://railway.app/button.svg)](https://railway.com/new/template/YOUR_TEMPLATE_CODE)
   ```
