# Run 3 Handoff: Workspace Script Normalization & Violation Fixes

## Goal

Add missing `lint`, `type-check`, and `test` scripts to all active workspaces, verify they pass, and fix any lint/format violations so quality gates can be enforced in Run 5.

## Current State (Post-Run 2)

- ✅ Root quality scripts exist: `lint`, `lint:fix`, `format`, `format:check`, `check`
- ✅ Stricter ESLint rules active (any + ts-ignore + prettier are now errors)
- ❌ Many files fail format check (Prettier violations)
- ❌ Many source files fail lint check (mostly `any` types and ts-ignore comments)
- ❌ Some workspaces lack required `lint` script (shared, sync-server, examples-components)
- ❌ No workspace has unified `type-check` or `check` scripts yet

## Workspace-by-Workspace Repairs

### Tier 1: Core SDK (Must Fix First)

**`packages/shared`**

- [ ] Add `lint` script to package.json
- [ ] Run `npm run lint:fix` to fix format violations
- [ ] Verify `npm run type-check` passes
- [ ] Verify `npm test` passes (if tests exist)
- [ ] Root `npm run check` must pass for this package

**`packages/db`**

- [ ] Run `npm run lint:fix` to fix Prettier violations (1 error already identified)
- [ ] Fix `@typescript-eslint/no-explicit-any` violations (39 errors):
  - Most in `events.ts`: Use proper event type definitions instead of `any`
  - In `examples/dbShape.ts`: Document example types more clearly
  - In `index.ts`, `loadRoom.ts`, `login.ts`, etc.: Replace with union types or proper generics
- [ ] Fix `@typescript-eslint/ban-ts-comment` violations: Add justification comments to ts-ignore directives
- [ ] Verify `npm run lint` passes
- [ ] Verify `npm run type-check` passes
- [ ] Verify `npm test` passes

### Tier 2: Active Backends

**`packages/auth-server-hono`**

- [ ] Add `lint` script to package.json (use eslint-config-ts)
- [ ] Run `npm run lint:fix` to fix format violations
- [ ] Fix any `any` type violations
- [ ] Verify `npm run lint` passes
- [ ] Verify `npm run type-check` passes
- [ ] Verify `npm test` passes

**`packages/sync-server`**

- [ ] Add `lint` script to package.json (use eslint-config-ts)
- [ ] Run `npm run lint:fix` to fix format violations
- [ ] Fix any `any` type violations (low volume expected)
- [ ] Verify `npm run lint` passes
- [ ] Verify `npm run type-check` passes
- [ ] Consider adding basic tests (optional for Phase 1, warn-level)

### Tier 3: Applications & Components

**`packages/ewe-note`**

- [ ] Run `npm run lint:fix` to fix Prettier violations
- [ ] Verify `npm run lint` passes (already configured, should be strict)
- [ ] Verify `npm run type-check` passes (already configured)

**`packages/examples-components`**

- [ ] Add `lint` script to package.json (use eslint-config-react-ts)
- [ ] Run `npm run lint:fix` to fix format violations
- [ ] Fix any `any` type violations
- [ ] Verify `npm run lint` passes
- [ ] Verify `npm run type-check` passes

**`examples/example-basic`**

- [ ] Run `npm run lint:fix` to fix Prettier violations
- [ ] Verify `npm run lint` passes (already configured)
- [ ] Verify `npm run type-check` passes (already configured)

### Tier 4: Migration Exemption

**`packages/auth-server` (Next.js, Keep Permissive)**

- [ ] Run `npm run format:check` locally; note any violations but defer fixes to post-migration
- [ ] Keep lint as warn (do NOT promote to error during Next.js migration)
- [ ] Verify `npm run type-check` passes (Next.js built-in)

---

## Implementation Order & Script Template

### 1. Add Missing Scripts to package.json

For **TypeScript-only packages** (syncs-server, auth-server-hono):

```json
{
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "vitest --run"
  }
}
```

For **React packages** (ewe-note, examples-components, example-basic):

```json
{
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "vitest --run" // if tests exist
  }
}
```

For **Shared Types** (packages/shared):

```json
{
  "scripts": {
    "lint": "eslint .",
    "type-check": "tsc --noEmit",
    "test": "vitest --run"
  }
}
```

### 2. Fix Violations in Priority Order

**Quick Wins (scripts):**

1. `npm run format:fix` in each workspace to fix Prettier issues
2. `npm run lint:fix` to auto-fix some lint issues

**Manual Fixes Required** (in order of priority):

1. Replace `any` types with proper types in packages/db (high-value)
2. Add descriptions to ts-ignore comments where they lack them
3. Verify type-check passes for all packages
4. Ensure tests pass where they exist

### 3. Verify at Each Stage

After each workspace is fixed:

```bash
cd <workspace>
npm run lint        # Must pass with no warnings (--max-warnings=0)
npm run type-check  # Must pass
npm run test        # Must pass (if tests exist)
```

Then verify root check works:

```bash
cd /path/to/eweser-db
npm run check       # Full validation pipeline
```

---

## Expected Effort Estimate

- **scripts additions**: ~5 packages, ~2 min per script = 10 min
- **Prettier fixes**: Run `npm run format:fix` in root = 5–10 min
- **Lint fixes**:
  - packages/db: 39 errors, ~1–2 errors per file, ~30–45 min
  - auth-server-hono: Expected 5–10 errors, ~15 min
  - sync-server: Expected 0–5 errors, ~5 min
  - examples-components: Expected 5–10 errors, ~15 min
  - Total: ~60–75 min
- **Total Run 3**: ~90–120 min of focused coder work

---

## Success Criteria

✅ All Tier 1 & Tier 2 packages pass `npm run lint` with no warnings  
✅ All Tier 1–3 packages pass `npm run type-check`  
✅ All Tier 1–3 packages pass `npm test` (if tests exist)  
✅ Root `npm run check` completes successfully for all active packages  
✅ All scripts are documented in each package README or LOCAL_DEVELOPMENT.md  
✅ Violations log is posted as comment or summary (for review transparency)

---

## Next Steps After Run 3

Once this run is complete and verified:

- **Run 4** will add stricter TypeScript options (noUncheckedIndexedAccess, exactOptionalPropertyTypes, etc.)
- **Run 5** will create/repair CI workflows to enforce gates on PRs
- **Run 6** will establish test coverage expectations and add test scripts where missing

## Notes for the Coder Agent

- **Avoid breaking changes**: Focus on local fixes (add types, fix comments), not API refactors.
- **Format first, lint second**: Run `npm run format:fix` before addressing any linting to reduce noise.
- **Preserve semantics**: When replacing `any`, maintain the original intent (use `unknown` for truly unknown types, proper types for typed APIs).
- **auth-server exemption**: Next.js auth-server is out-of-scope for aggressive strictness during migration. Keep it at warn level.
- **Test incrementally**: After each workspace, run root `npm run check` to catch cascade failures early.
