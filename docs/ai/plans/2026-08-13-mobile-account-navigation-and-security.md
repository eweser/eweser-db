# Plan: Mobile Account Navigation And Security Simplification

## Goal

Give signed-in mobile users a compact Account menu, while making the Security page calm, state-aware, and safe to operate.

## Scope

- In: Mobile Account sheet navigation, theme control, separated sign-out action, responsive account-shell cleanup, state-aware 2FA controls, plain-language security copy, action-local status feedback, and focused tests.
- Out: Database migrations, passkey support, active-session management, account deletion, and public package API changes.

## Assumptions / Open Questions

- Assumption: `twoFactorEnabled` on the authenticated auth-server user is the canonical 2FA state and can be returned by the existing bootstrap endpoint.
- Assumption: The user's “Do these now in one go” approves this plan and its security UX behavior, including confirmation before disabling 2FA or replacing backup codes.

## Domain Language

- Glossary docs: `GLOSSARY.md`, `packages/auth-server-hono/GLOSSARY.md`.
- New terms: None.
- Changed terms: Use “two-factor authentication” and “backup codes” in user copy; do not expose implementation dependencies as product copy.
- ADR candidates: None; this is a bounded UI and existing bootstrap-response change.

## Runs

## Run Order And Manual Test Handoffs

Run order: Sequential. Run 1 defines the bootstrap state consumed by Run 2.

### Run 1: Expose Two-Factor State

- **Id**: `run-1`
- **Title**: Expose two-factor status through the existing account bootstrap response
- **UI classification**: `ui: false`
- **Browser checkpoint**: `none`
- **Deliverable**: Signed-in clients can distinguish two-factor setup from management without inference.
- **Files**:
  - `packages/auth-server-hono/src/routes/account.ts`: include the authenticated user's two-factor state in bootstrap.
  - `packages/auth-server-hono/src/routes/account.test.ts`: verify the bounded response field.
  - `packages/app/src/lib/api.ts`: type the response field.
- **Steps**:
  - [ ] Add the boolean state without widening other identity data.
  - [ ] Cover the response contract with a route test.
- **Tests**: `npm test --workspace @eweser/auth-server-hono`.
- **Verification**: Confirm only the signed-in account bootstrap response receives the state.
- **Manual test handoff**: Not needed: the state is exercised through Run 2.
- **Dependencies**: None.
- **Model tier**: `strong`
- **Risk level**: `medium`

### Run 2: Mobile Navigation And Security Flow

- **Id**: `run-2`
- **Title**: Implement the compact mobile account sheet and simplified Security page
- **UI classification**: `ui: true`
- **Browser checkpoint**: `focused`
- **Deliverable**: Mobile header has one compact Account control; Security shows one context-appropriate 2FA path with confirmations for destructive recovery actions.
- **Files**:
  - `packages/app/src/pages.tsx`: account sheet, state-aware 2FA UI, plain-language copy, local status feedback.
  - `packages/app/src/index.css`: mobile sheet, reduced settings surface hierarchy, and responsive sidebar behavior.
  - `packages/app/src/App.test.tsx`: navigation and security-state behavior tests.
- **Steps**:
  - [ ] Replace the mobile header sign-out button with an accessible Account menu containing navigation, theme choice, and a separated “Sign out of this device” action.
  - [ ] Remove the duplicated mobile sidebar navigation.
  - [ ] Replace the card-heavy Security overview with compact status rows and actionable-only copy.
  - [ ] Render setup, enrollment, and management states separately; require an explicit confirmation before disabling 2FA or regenerating backup codes.
  - [ ] Announce action-local success and errors.
- **Tests**: `npm test --workspace @eweser/app`; `npm run type-check --workspace @eweser/app`; `npm run build --workspace @eweser/app`.
- **Verification**: Focused signed-in mobile browser checkpoint using synthetic local data, including opening the Account sheet and reviewing the Security setup state.
- **Manual test handoff**:
  - Start the local app against fixture auth data.
  - At 390px, open `/security`, then Account; verify navigation, theme action, and separated sign-out row.
  - Verify that a user without 2FA sees only setup; verify management actions require explicit confirmation when 2FA is enabled.
- **Dependencies**: `run-1`.
- **Model tier**: `strong`
- **Risk level**: `high`

## Stop Conditions

Stop and ask for user approval if implementation requires migrations, changes to the underlying Better Auth 2FA protocol, public package API changes, or a security behavior outside the stated confirmation and status UX.

## Approval Boundary

The user's approval in this conversation authorizes Coder to implement the runs above, write focused tests, perform browser verification with synthetic data, commit, push a feature branch, and open a ready-for-review PR. It does not authorize direct main pushes, production deployment, credential handling, migrations, or unrelated account redesign.

## Execution Summary

| Run     | Status   | Files Changed                                                 | Verification                                                                                        | Notes                                                                                                                   |
| ------- | -------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `run-1` | Complete | `account.ts`, `account.test.ts`, `api.ts`                     | 10 focused route tests pass                                                                         | Bootstrap reads the canonical account record and returns only the boolean state.                                        |
| `run-2` | Complete | Account sheet, Security UI, responsive CSS, focused app tests | 28 app tests, app type-check and production build pass; 390px synthetic browser checkpoint complete | Included a portal to keep the sheet above the sticky header, a QR enrollment step, and destructive-action confirmation. |

## Self-Reflection / Instruction Improvements

- The auth-server workspace type-check remains blocked by unrelated existing missing `@eweser/logger` declarations and access-grant request typing. The changed bootstrap field type-checks through the focused route test, while the app type-check passes.
