# Plan: EweNote Feature Testing

## Goal

Add `data-cy` selectors to every un-covered feature and write Cypress E2E tests for all 35 audited EweNote features, organised into 8 test groups.

## Scope

- **In:** `packages/ewe-note/src/app/**` (data-cy additions), `e2e/cypress/tests/ewe-note.cy.ts` (new tests)
- **Out:** Auth-server E2E (covered elsewhere), sync-server/Hocuspocus tests, Vitest unit tests, example-basic app tests

## Current state

Existing `ewe-note.cy.ts` covers:

- App loads (spinner gone, editor present)
- Sidebar + login/logout visibility
- Create note (new-note button)
- Switch between notes
- Create folder (via `window.prompt` stub)
- Reload persistence
- Login link URL
- Typing updates title + content persistence

**Not yet covered** (gaps after last audit):

- Delete note, Rename note (context menu + editor dropdown)
- Copy Link, Duplicate, Export (editor ⋯ menu)
- Focus Mode toggle
- Right Panel (open/close, add tag, add property, backlinks)
- Command palette (search, create-from-palette, Browse Templates)
- Templates (list, use, create, delete)
- Tasks view (checkbox parsing, grouping)
- Drag-and-drop note between folders
- Share folder dialog (open, copy link)
- Settings page (navigate, content, sign-out)

---

## Runs

### Run 1 — Add `data-cy` selectors (prerequisite for all other runs)

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Mechanical additions of `data-cy` attributes to known DOM nodes; no logic changes.

Files to change:

| File                                            | Selector(s) to add                                                                                                                                                                          |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/pages/EnhancedEditor.tsx`              | `ewe-note-info-panel-toggle`, `ewe-note-focus-mode`, `ewe-note-duplicate`, `ewe-note-export`, `ewe-note-copy-link`, `ewe-note-delete-note`                                                  |
| `src/app/components/RightPanel.tsx`             | `ewe-note-right-panel`, `ewe-note-add-tag-input`, `ewe-note-add-tag-btn`, `ewe-note-add-property-key`, `ewe-note-add-property-value`, `ewe-note-add-property-btn`                           |
| `src/app/components/EnhancedCommandPalette.tsx` | `ewe-note-command-palette`, `ewe-note-command-input`, `ewe-note-browse-templates`                                                                                                           |
| `src/app/components/TemplatesDialog.tsx`        | `ewe-note-templates-dialog`, `ewe-note-templates-use-{id}`, `ewe-note-templates-delete-{id}`, `ewe-note-new-template-name`, `ewe-note-new-template-content`, `ewe-note-create-template-btn` |
| `src/app/pages/EnhancedHome.tsx`                | `ewe-note-tasks-view`, `ewe-note-task-item-{id}`                                                                                                                                            |
| `src/app/components/ShareFolderDialog.tsx`      | `ewe-note-share-dialog`, `ewe-note-share-link-input`, `ewe-note-share-copy-btn`                                                                                                             |
| `src/app/pages/Settings.tsx`                    | `ewe-note-settings-page`, `ewe-note-settings-homeserver`, `ewe-note-settings-signout`                                                                                                       |
| `src/app/components/EnhancedSidebar.tsx`        | `ewe-note-settings-link`, `ewe-note-tasks-link`, `ewe-note-recent-link`                                                                                                                     |

Steps:

- [ ] Add all `data-cy` attributes listed above
- [ ] Run `npx tsc --noEmit` to verify no TS errors

---

### Run 2 — Core CRUD tests (delete, rename, duplicate, export, copy-link)

- **Recommended Agent:** `02-coder` (Smart)
- **Reason:** Needs careful handling of `window.confirm`/`window.prompt` stubs and clipboard API mocking in Cypress.

Tests to add to `e2e/cypress/tests/ewe-note.cy.ts`:

```
describe('Note CRUD — delete and rename')
  it('deletes a note via the editor ⋯ menu and navigates back to home')
  it('deletes a note via the sidebar context menu')
  it('renames a note via the sidebar context menu and sidebar title updates')

describe('Editor toolbar actions')
  it('Copy Link copies the current URL to clipboard')
  it('Duplicate creates a new note with "Copy of" prefix and navigates to it')
  it('Export as Markdown triggers a file download')
```

Test patterns:

- `window.confirm` → `cy.stub(win, 'confirm').returns(true)`
- `window.prompt` → `cy.stub(win, 'prompt').returns('new name')`
- Clipboard → `cy.stub(win.navigator.clipboard, 'writeText').resolves()`
- Download → `cy.stub` on `HTMLAnchorElement.prototype.click`, assert `href` contains `.md`
- Right-click context menu → `cy.getBySel('ewe-note-note-item-*').rightclick()`

---

### Run 3 — Focus Mode + Right Panel tests

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Simple toggle/visibility checks, one data mutation (add tag).

Tests to add:

```
describe('Focus Mode')
  it('entering focus mode hides the sidebar and shows Exit Focus Mode button')
  it('exiting focus mode restores the normal editor layout')

describe('Right Panel — info panel')
  it('clicking the info-panel-toggle opens the right panel')
  it('closing the panel via the X button hides it')
  it('adding a tag in the panel makes the tag badge appear in the editor header')
  it('adding a property makes the property badge appear in the editor header')
  it('backlinks tab shows a linked note when content contains [[note title]]')
```

---

### Run 4 — Command palette tests

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Straightforward keyboard + type + assert pattern.

Tests to add:

```
describe('Command palette')
  it('opens with Ctrl+K and closes with Esc')
  it('typing filters the recent note list to matching titles')
  it('selecting a search result navigates to that note')
  it('typing and selecting "Create ..." creates a new note with that title')
  it('"Browse Templates" item opens the TemplatesDialog')
```

---

### Run 5 — Templates tests

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Dialog interactions; localStorage persistence check.

Tests to add:

```
describe('Templates')
  it('opening the TemplatesDialog shows default templates')
  it('"Use Template" creates a new note with the template content and navigates to it')
  it('creating a custom template saves it and it appears in the list')
  it('custom templates persist after page reload (localStorage)')
  it('deleting a template removes it from the list')
```

---

### Run 6 — Tasks view tests

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Read-only view that derives from note content; simple assertions.

Tests to add:

```
describe('Tasks view')
  it('switching to Tasks nav shows tasks extracted from notes with checkboxes')
  it('tasks are grouped by source note title')
  it('clicking the note title in a task group navigates to the editor')
  it('no tasks shows the "No tasks found" empty state')
```

---

### Run 7 — Folders, drag-and-drop, and Share dialog

- **Recommended Agent:** `02-coder` (Smart)
- **Reason:** Drag-and-drop requires `cypress-real-events` or mouse event sequence; share dialog tests clipboard.

Additional dependency to add:

```bash
npm install -D cypress-real-events  # or use existing mouse-event approach
```

Tests to add:

```
describe('Folders')
  it('creating a note via the folder + button places it in that folder')
  it('dragging a note to a different folder moves it there')

describe('Share folder dialog')
  it('clicking the share icon opens the dialog for that folder')
  it('the share link input contains the current origin and folder id')
  it('clicking Copy copies the link to clipboard (clipboard stub)')
  it('the dialog shows the "coming soon" info banner — no Add People form')
```

---

### Run 8 — Settings page tests

- **Recommended Agent:** `02-coder` (Fast)
- **Reason:** Navigation + static content assertions.

Tests to add:

```
describe('Settings page')
  it('clicking Settings in the sidebar navigates to /settings')
  it('the settings page shows the homeserver URL from env')
  it('shows Sign in button when not authenticated')
  it('sign-out button is hidden when not authenticated')
```

---

## Risks

- **Drag-and-drop** — react-dnd HTML5 backend is notoriously difficult to test in Cypress without `cypress-real-events` or a custom drag helper. Run 7 may need a conditional skip if the drag helper is unavailable in CI.
- **Clipboard** — `navigator.clipboard.writeText` requires HTTPS or `cy.window` stub. The stub approach works for unit-level assertions; CI may need `--chrome-web-security=false` or a real HTTPS origin.
- **Download** — Cypress can't directly intercept `a.click()` on a blob URL easily. The test should stub `HTMLAnchorElement.prototype.click` and assert the `href`/`download` attribute instead of the actual file.
- **Data-cy on dynamic items** — Template `data-cy` attributes use the template id; tests must read the id from rendered DOM rather than hardcoding it.

## Execution Summary

```
Run 1: Add data-cy selectors (Fast)
├── Run 2: CRUD + toolbar actions (Smart)  ←  depends on Run 1
├── Run 3: Focus Mode + Right Panel (Fast) ←  depends on Run 1
├── Run 4: Command palette (Fast)          ←  depends on Run 1
├── Run 5: Templates (Fast)                ←  depends on Run 1
├── Run 6: Tasks view (Fast)               ←  depends on Run 1
├── Run 7: Folders + Drag + Share (Smart)  ←  depends on Run 1
└── Run 8: Settings (Fast)                 ←  depends on Run 1
```

Runs 2–8 are all independent of each other and can be executed in parallel after Run 1 completes.

## Status

- [x] Approved by user
- [x] Run 1: Add data-cy selectors — complete
- [x] Run 2: CRUD + toolbar tests — complete
- [x] Run 3: Focus Mode + Right Panel tests — complete
- [x] Run 4: Command palette tests — complete
- [x] Run 5: Templates tests — complete
- [x] Run 6: Tasks view tests — complete
- [x] Run 7: Folders + Share dialog tests — complete
- [x] Run 8: Settings page tests — complete
