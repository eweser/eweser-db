# Phase 5: Mobile (Capacitor)

> **Plan:** [Big Refactor Index](./historical/2026-04-02-big-refactor.md)
> **Prerequisite:** Run 2.3 complete (ewe-note works as a standalone SPA + PWA)
> **Goal:** Wrap ewe-note as a native mobile app using Capacitor. `@eweser/db` runs unchanged in the WebView — IndexedDB, WebSocket, Hocuspocus provider all work natively.

Hard-cutover assumption: mobile support is built only on the new Hono + better-auth + Hocuspocus stack.

## Progress

- [ ] Run 5.1 — Add Capacitor to ewe-note
- [ ] Run 5.2 — Native capabilities (optional)
- [ ] Run 5.3 — App Store preparation (future)

## Agent Scratchpad

> Use this section to track decisions, blockers, and notes during implementation.

---

## Run 5.1: Add Capacitor to ewe-note

**Recommended Agent:** `02-coder` (Smart)
**Reason:** Native platform configuration and Capacitor initialization.

**What:** Initialize Capacitor in the ewe-note package. Capacitor wraps the Vite SPA in a native WebView — the entire `@eweser/db` SDK runs unchanged (IndexedDB for persistence, WebSocket for Hocuspocus sync).

**Files:**

- `packages/ewe-note/package.json` — add `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- `packages/ewe-note/capacitor.config.ts` — Capacitor config:

  ```typescript
  import type { CapacitorConfig } from '@capacitor/cli';

  const config: CapacitorConfig = {
    appId: 'com.eweser.ewenote',
    appName: 'Ewe Note',
    webDir: 'dist',
    server: {
      // For dev: point to Vite dev server
      // url: 'http://192.168.x.x:5173',
      // cleartext: true,
    },
  };

  export default config;
  ```

- Run `npx cap add ios` → creates `packages/ewe-note/ios/`
- Run `npx cap add android` → creates `packages/ewe-note/android/`
- Add to `.gitignore`: `ios/App/App/public/`, `android/app/src/main/assets/public/` (built assets)

**Build flow:**

```bash
cd packages/ewe-note
npm run build          # Vite builds to dist/
npx cap sync           # Copies dist/ to native projects + installs plugins
npx cap open ios       # Opens in Xcode
npx cap open android   # Opens in Android Studio
```

**Tests:**

- `npm run build && npx cap sync` completes without errors
- iOS simulator: app opens, login page renders, can authenticate
- Android emulator: same
- Offline: create notes without network → reconnect → notes sync via Hocuspocus

**Done when:** Ewe Note runs as a native app on iOS simulator and Android emulator, with full auth + Hocuspocus sync + offline persistence via IndexedDB in the WebView.

**Risks:**

- WebView IndexedDB storage limits on iOS (default ~50MB, expandable) — fine for notes
- Deep links / OAuth redirect handling in native WebView may need `@capacitor/browser` plugin for OAuth flows
- iOS WKWebView works well with WebSocket; older Android WebViews may need `@capacitor/app` lifecycle handling for background/resume

---

## Run 5.2: Native capabilities (optional)

**What:** Add native plugins for capabilities that improve the mobile experience beyond what a PWA offers.

**Plugins to evaluate:**

- `@capacitor/push-notifications` — notify when shared docs are updated
- `@capacitor/share` — native share sheet for room invite links
- `@capacitor/filesystem` — export notes as files
- `@capacitor/haptics` — tactile feedback
- `@capacitor/status-bar` — style the status bar
- `@capacitor/splash-screen` — app launch screen
- `@capacitor/keyboard` — keyboard behavior for the editor

**Files:**

- `packages/ewe-note/package.json` — add selected plugins
- `packages/ewe-note/src/lib/native.ts` — native capability abstraction (no-op on web)
- `packages/ewe-note/ios/` and `android/` — plugin registration (auto via `cap sync`)

**Done when:** At least splash screen + status bar + share are working. Push notifications are stretch.

_Note: This run is aspirational — the core mobile story is complete after Run 5.1._

---

## Run 5.3: App Store preparation (future)

**What:** Prepare for App Store (iOS) and Play Store (Android) submission.

**Files:**

- App icons and splash screens (all required sizes)
- `packages/ewe-note/ios/App/App/Info.plist` — permissions, descriptions
- `packages/ewe-note/android/app/src/main/AndroidManifest.xml` — permissions
- Privacy policy URL (already exists from packages/app)
- Screenshots for store listings

**Done when:** Builds pass App Store / Play Store review.

_Note: Deferred until the app is polished enough for public release._

## Execution Summary

```text
Run 5.1: Add Capacitor to ewe-note (Smart)
└── Run 5.2: Native capabilities (Fast)
```

## Status

- [ ] Approved by user
