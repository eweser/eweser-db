# Plan: 2FA & User Security

## Goal

Add TOTP-based two-factor authentication to `auth-server-hono` and `auth-pages` so that every app using eweser-db gets 2FA enforcement for free, with a reusable `<TwoFactorSettings />` component for apps that want inline security management.

## Scope

- **In:**
  - Enable `twoFactor()` plugin in `better-auth` (`auth-server-hono`)
  - New Drizzle migration for the `twoFactor` table
  - 2FA verification interstitial in the sign-in flow (`auth-pages`)
  - `/account/security` page for TOTP enrollment, disable, and backup code regeneration (`auth-pages`)
  - `<TwoFactorSettings />` reusable React component in `examples-components`
  - ewe-note "Security" settings section using the component

- **Out:**
  - Email OTP (deferred — requires email sender infra)
  - Mandatory/forced 2FA for all users (optional enrollment only)
  - SMS 2FA
  - Hardware key / passkey (future work, separate plan)
  - Changes to sync-server JWT or room access logic (2FA is an auth-layer concern only)

## Decision Record

| Decision                | Choice                          | Rationale                                                      |
| ----------------------- | ------------------------------- | -------------------------------------------------------------- |
| TOTP vs email OTP       | TOTP only                       | No email sender needed; more secure; works offline             |
| Enrollment policy       | Optional per-user               | Non-disruptive for existing users; can raise to enforced later |
| Backup codes            | Always issued on enrollment     | Required recovery path; better-auth generates automatically    |
| Where enforcement lives | `auth-pages` sign-in flow       | Apps get it for free via redirect; zero per-app integration    |
| Inline management       | `examples-components` component | Opt-in for apps like ewe-note                                  |

---

## Runs

### Run 1: Backend — enable `twoFactor` plugin

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Requires understanding better-auth plugin API, Drizzle schema conventions, and verifying the schema migration doesn't break existing tables.

**Steps:**

- [ ] Add `import { twoFactor } from 'better-auth/plugins'` to `packages/auth-server-hono/src/auth.ts`
- [ ] Wire `plugins: [twoFactor()]` in the `betterAuth(...)` config; pass `issuer` (e.g. `'EweserDB'` or use `env.BETTER_AUTH_BASE_URL` hostname)
- [ ] Run `npx drizzle-kit generate` inside `packages/auth-server-hono` — confirms new `two_factor` table migration is generated
- [ ] Verify migration file in `packages/auth-server-hono/drizzle/` looks correct (columns: `id`, `userId`, `secret`, `backupCodes`, `enabled`, `createdAt`)
- [ ] Add the new migration file to source control (do NOT auto-migrate in the Dockerfile — keep the existing `drizzle-kit migrate` approach)
- [ ] Update `env.ts` if any new env vars are needed (e.g. `TWO_FACTOR_ISSUER` — optional, can default in code)

**Files to change:**

| File                                                           | Change                                                |
| -------------------------------------------------------------- | ----------------------------------------------------- |
| `packages/auth-server-hono/src/auth.ts`                        | Add `twoFactor()` plugin                              |
| `packages/auth-server-hono/drizzle/<timestamp>_two_factor.sql` | New generated migration (committed, not hand-written) |
| `packages/auth-server-hono/src/env.ts`                         | Optional: `TWO_FACTOR_ISSUER` env var                 |
| `packages/auth-server-hono/example.env`                        | Document new optional env var                         |

**Tests:**

- [ ] Existing `auth.test.ts` and `account.test.ts` must still pass (plugin addition is additive)
- [ ] New test in `auth.test.ts`: verify the `twoFactorRequired` step is returned when 2FA is enabled for a user and they sign in

---

### Run 2: Auth pages — sign-in interstitial + `/account/security` page

- **Recommended Agent**: `02-coder` (Smart)
- **Reason**: Multi-step UI state machine (normal sign-in → 2FA check → verify), plus new route and forms. Needs to match the existing auth-pages design system (`ui.tsx`).
- **Depends on**: Run 1 (needs `twoFactorClient()` plugin available from backend)

**Steps:**

**Auth client upgrade:**

- [ ] In `packages/auth-pages/src/lib/auth-client.ts`, import `twoFactorClient` from `better-auth/client/plugins` and add it to `createAuthClient`
- [ ] This adds typed methods: `authClient.twoFactor.getTotpUri()`, `authClient.twoFactor.enable()`, `authClient.twoFactor.disable()`, `authClient.twoFactor.verifyTotp()`, `authClient.twoFactor.generateBackupCodes()`

**Sign-in interstitial:**

- [ ] In `SignInPage`, after a successful `authClient.signIn.email()` call, check if the response contains `twoFactorRequired: true`
- [ ] If so, render a `<TotpVerifyStep />` sub-component (inline, not a separate route) that:
  - Shows a 6-digit OTP input field
  - Calls `authClient.twoFactor.verifyTotp({ code })` on submit
  - On success: navigates to post-auth path
  - On error: shows inline error with remaining attempts if available
  - Has a "Use backup code" toggle that switches to a longer text input and calls the same endpoint with the backup code
- [ ] Social sign-in (GitHub/Google) is not affected — OAuth providers handle their own MFA

**New `/account/security` route:**

- [ ] Add `<Route path="/account/security" element={<ProtectedRoute><SecurityPage /></ProtectedRoute>} />` to `AppShell`
- [ ] `SecurityPage` shows:
  - **2FA status** — enabled or not, with setup date
  - **Enable TOTP** flow (only shown when 2FA is disabled):
    1. Call `authClient.twoFactor.getTotpUri()` → display QR code (use `qrcode.react` or similar)
    2. User scans QR, enters verification code
    3. Call `authClient.twoFactor.enable({ password, totpCode })` → success shows backup codes one-time display
  - **Disable TOTP** (only shown when 2FA is enabled):
    - Requires current OTP code
    - Calls `authClient.twoFactor.disable({ password })`
  - **Regenerate backup codes** (shown when enabled):
    - Calls `authClient.twoFactor.generateBackupCodes({ password })`
    - Shows new codes one-time
- [ ] Add a "Security" link in `SiteHeader` nav for signed-in users

**Files to change:**

| File                                         | Change                                                                            |
| -------------------------------------------- | --------------------------------------------------------------------------------- |
| `packages/auth-pages/src/lib/auth-client.ts` | Add `twoFactorClient()` plugin                                                    |
| `packages/auth-pages/src/pages.tsx`          | `TotpVerifyStep` in `SignInPage`; `SecurityPage`; new route; security header link |
| `packages/auth-pages/package.json`           | Add `qrcode.react` (or `react-qr-code`) dependency                                |

**Tests:**

- [ ] `App.test.tsx`: add mock for `authClient.twoFactor.*` methods
- [ ] Test sign-in flow when `twoFactorRequired` is returned — shows TOTP step
- [ ] Test TOTP verification success and error states
- [ ] Test security page renders (mount + assert key UI states)

---

### Run 3: `examples-components` — `<TwoFactorSettings />` reusable component

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Mostly porting the auth-pages Security page logic into a portable, prop-driven component. Boilerplate-heavy, lower complexity.
- **Depends on**: Run 1 (plugin must be enabled). Can be developed in parallel with Run 2.
- **Changeset required**: Yes — `@eweser/examples-components` is a published package.

**Steps:**

- [ ] Create `packages/examples-components/src/components/TwoFactorSettings.tsx`
  - Props: `authServerUrl: string` (used to initialize a local `createAuthClient` with `twoFactorClient()`)
  - Renders: current 2FA status, enable/disable/regenerate-backup-codes flows identical to `SecurityPage` above but using the passed `authServerUrl`
  - Uses plain inline styles (matching the existing `LoginButton` / `StatusBar` component pattern — no Tailwind/Radix dependencies)
- [ ] Export from `packages/examples-components/src/components/index.ts`
- [ ] Add `better-auth` as a peer dependency in `packages/examples-components/package.json` (it's already a dep in auth-pages; apps will have it if they use auth-pages redirects)
- [ ] Run `npm run changeset` and create a `minor` changeset for `@eweser/examples-components`

**Files to change / create:**

| File                                                                | Change                         |
| ------------------------------------------------------------------- | ------------------------------ |
| `packages/examples-components/src/components/TwoFactorSettings.tsx` | New component                  |
| `packages/examples-components/src/components/index.ts`              | Export `TwoFactorSettings`     |
| `packages/examples-components/package.json`                         | Add `better-auth` peer dep     |
| `.changeset/<hash>.md`                                              | Auto-generated minor changeset |

**Tests:**

- [ ] `packages/examples-components`: add `TwoFactorSettings.test.tsx` — mount with a mock `authServerUrl`, assert key UI elements render

---

### Run 4: ewe-note — inline 2FA management

- **Recommended Agent**: `02-coder` (Fast)
- **Reason**: Drop-in integration using the component from Run 3. Minimal logic.
- **Depends on**: Run 3 complete and built.

**Steps:**

- [ ] Locate the existing profile/settings UI in `packages/ewe-note/src/` (likely the `DbProvider` or a settings panel)
- [ ] Add a "Security" section in the settings/profile area that renders `<TwoFactorSettings authServerUrl={config.AUTH_SERVER} />`
- [ ] Optionally: add a dismissable banner on the main view for users with 2FA disabled, linking to the security section
- [ ] No changeset needed (ewe-note is not a published package)

**Files to change:**

| File                                    | Change                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `packages/ewe-note/src/<settings-file>` | Add `<TwoFactorSettings />` section                  |
| `packages/ewe-note/package.json`        | Bump `@eweser/examples-components` version if needed |

**Tests:**

- [ ] Verify ewe-note builds (`npm run build`) with no type errors after integration

---

## Risks

1. **better-auth `twoFactor` plugin API stability** — Plugin is in `better-auth` v1.x. Confirm exact import path and method names against the installed `1.5.6` docs before coding. The plugin may require `twoFactor()` to be present on _both_ server auth config and client.
2. **QR code library bundle size** — `qrcode.react` adds ~15KB gzip to `auth-pages`. Accept this; it's only loaded on the security page.
3. **`examples-components` has no Tailwind/Radix** — `TwoFactorSettings` must use inline styles or a style-agnostic approach to avoid forcing consumers to install Tailwind. The existing components use inline styles; follow that pattern.
4. **Database migration on production** — Run 1 generates a migration. Deployment must apply it before the auth server restarts with the plugin enabled, otherwise the server will crash on first 2FA API call. The existing `drizzle-kit migrate` step in the Docker entrypoint handles this automatically.
5. **Session state after 2FA verify** — better-auth issues a final session cookie only after the TOTP step completes. Ensure the redirect logic in `SignInPage` waits for the verified session, not the intermediate one.
6. **Social sign-in (OAuth) 2FA** — GitHub/Google OAuth does not trigger the `twoFactorRequired` step through better-auth's current plugin. Users who sign in via OAuth bypass TOTP. This is acceptable for now (documented limitation).

---

## Execution Summary

```text
Run 1: Backend — enable twoFactor plugin (Smart)
├── Run 2: Auth pages — sign-in interstitial + security page (Smart)
│   └── depends on Run 1
└── Run 3: examples-components — TwoFactorSettings component (Fast)
    └── Run 4: ewe-note — inline 2FA management (Fast)
        └── depends on Run 3
```

Runs 2 and 3 can proceed concurrently once Run 1 is complete, since Run 3 only needs the plugin enabled to test against, and its component API can be designed before Run 2 is fully coded.

---

## Status

- [ ] Approved by user
