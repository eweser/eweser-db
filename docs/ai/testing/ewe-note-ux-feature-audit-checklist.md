# EweNote UX and Feature Completion Audit Checklist

Audience: local browser tester.

Goal: verify whether EweNote feels complete as a local-first note app and identify concrete UX, feature, and trust gaps. This is not a Cypress checklist; use the visible app and record observations with screenshots or short notes.

## Setup

- Start from the repo root: `npm run dev --workspace @eweser/ewe-note`
- Open the Ewe Note dev server. Current repo docs list `http://localhost:5181/`.
- Use a clean browser profile or clear EweNote local storage before the first pass.
- Test at least desktop width and mobile/narrow width.
- Record:
  - route or screen
  - action taken
  - expected result
  - actual result
  - console errors
  - network/auth errors
  - layout/accessibility issues
  - whether the issue blocks launch, weakens trust, or is polish

## Product Assumptions To Test Against

- EweNote is local-first: users can create and edit notes before signing in.
- Signing in adds sync; it must not feel required for basic note-taking.
- The first screen is the notes workspace, not onboarding or marketing.
- Folders are personal organization. Shared rooms/spaces are collaboration or access boundaries.
- TipTap is the current editor. Expect Obsidian-style Markdown behavior,
  source mode fallback, slash commands, context menus, and lossless OFM export
  where this branch claims parity.
- Markdown, wiki links, tags, properties, backlinks, and Obsidian-style workflows are part of the intended direction.
- Sharing/collaboration must not overpromise if real access grants are not wired.
- PWA/offline support is in scope enough to audit visible behavior and trust cues.

## 1. First Load and Empty State

- [ ] App loads to the notes workspace without requiring login.
- [ ] Loading spinner resolves quickly and does not get stuck.
- [ ] Empty or first-run state makes it obvious how to create the first note.
- [ ] Sidebar, main content, settings/account entry, and new-note action are visible.
- [ ] No console errors on first load.
- [ ] Flag if the app starts with confusing sample data, no clear primary action, or a blank/ambiguous workspace.

## 2. Local-First Persistence

- [ ] Create a note while signed out.
- [ ] Add title and body content.
- [ ] Reload the editor route; content remains.
- [ ] Return home; note appears with the correct title/preview.
- [ ] Close/reopen the tab; note remains.
- [ ] Turn network offline if practical; basic editing still works.
- [ ] Flag if unsynced/offline state is not explained, content disappears, or reload loses edits.

## 3. Note Creation and Editing

- [ ] New Note button creates a note and opens the editor.
- [ ] Typing into the editor feels immediate and stable.
- [ ] Note title can be edited from the header.
- [ ] Title updates propagate back to sidebar/home cards.
- [ ] Empty note, long note, long title, and multiline markdown all behave reasonably.
- [ ] Editor keeps focus where expected after route changes, reload, and focus mode exit.
- [ ] Flag if the title source is confusing between markdown heading, frontmatter, and header input.

## 4. Note CRUD and Safety

- [ ] Pin and unpin a note from the editor.
- [ ] Pin and unpin a note from home/sidebar where available.
- [ ] Duplicate a note and verify content, tags, properties, and folder assignment.
- [ ] Delete a note from the editor menu.
- [ ] Delete a note from home/sidebar where available.
- [ ] Confirm destructive actions are clearly labeled and not too easy to trigger.
- [ ] Flag if deletion has no undo/recovery story or if duplicate/delete leaves stale sidebar/home state.

## 5. Library and Note List Views

- [ ] All Notes shows all current notes.
- [ ] Recent shows recent notes in a sensible order.
- [ ] Pinned section appears only when notes are pinned.
- [ ] The first screen feels like a notes library, not a metrics dashboard.
- [ ] Note previews are readable and do not expose raw markdown in a jarring way.
- [ ] Empty states for no notes, no pinned notes, and no tasks are useful.
- [ ] Flag if counts are wrong, active nav state is stale, or layouts jump when cards update.

## 6. Folders and Organization

- [ ] Create a folder from the sidebar.
- [ ] Folder creation uses a visible dialog, not a native browser prompt.
- [ ] Rename a folder from the visible folder-row actions.
- [ ] Create a note inside that folder.
- [ ] Folder note count updates.
- [ ] Folder can expand/collapse.
- [ ] Moving a note into a folder works through a visible menu or drag/drop.
- [ ] Notes without folders are still discoverable.
- [ ] Shared-room-like entries are visually distinguishable from normal folders.
- [ ] Flag if the UI blurs "folder" and "shared space" semantics, or if folder actions rely on browser prompts in a way that feels unfinished.

## 7. Search and Command Palette

- [ ] Search button opens command palette.
- [ ] Cmd/Ctrl+K opens and Esc closes it.
- [ ] Search finds notes by title.
- [ ] Search finds notes by body text.
- [ ] Search finds notes by tags/properties if present.
- [ ] Selecting a result navigates to the note.
- [ ] Typing a new title and selecting create makes a new note.
- [ ] Recent notes appear when no query is entered.
- [ ] Flag if keyboard navigation, Enter behavior, empty result behavior, or focus handling is unreliable.

## 8. Templates

- [ ] Browse Templates opens from the command palette.
- [ ] Default templates are present and understandable.
- [ ] Use Template creates a note with expected content, tags, and properties.
- [ ] Create a custom template.
- [ ] Custom template persists after reload.
- [ ] Delete a custom template.
- [ ] Flag if templates feel local-only without explanation, or if they do not support realistic user templates.

## 9. Tasks

- [ ] Create a note containing `- [ ] Incomplete task`.
- [ ] Create a note containing `- [x] Completed task`.
- [ ] Tasks view shows incomplete tasks.
- [ ] Tasks are grouped by source note.
- [ ] Clicking the source note opens that note.
- [ ] Completed tasks are hidden or visually handled according to the product expectation.
- [ ] Flag if users can see tasks but cannot complete/manage them and the limitation is not clear.

## 10. Tags, Properties, and Metadata

- [ ] Open note info/right panel.
- [ ] Add a tag.
- [ ] Remove a tag.
- [ ] Add a property.
- [ ] Remove a property.
- [ ] Tags/properties update the editor header and search.
- [ ] Metadata dates and word/character counts look sane.
- [ ] Flag if frontmatter, header badges, and right-panel metadata disagree.

## 11. Outline and Links

- [ ] Add multiple markdown headings to a note.
- [ ] Open the Outline tab in the right panel.
- [ ] Verify headings are listed in order and hierarchy is readable.
- [ ] Click outline headings and check whether the editor scrolls to the heading.
- [ ] Create two notes and link one using `[[Other Note Title]]`.
- [ ] Verify outgoing link appears.
- [ ] Verify backlink appears on the linked note.
- [ ] Click outgoing link/backlink and confirm navigation.
- [ ] Flag if outline buttons do nothing, wiki-link parsing is brittle, or links do not handle aliases/case predictably.

## 12. Editor Actions

- [ ] Copy Link copies the current editor URL.
- [ ] Export as Markdown downloads a sensible `.md` filename and content.
- [ ] Focus Mode hides navigation and shows a clear exit path.
- [ ] Exiting focus mode restores the normal layout without losing edits.
- [ ] Flag if copy/export works only in secure contexts without fallback messaging.

## 13. Account, Auth, and Sync Messaging

- [ ] Settings page opens from the sidebar.
- [ ] Account section shows signed-out state clearly.
- [ ] Sign in to sync points to the expected auth/app URL.
- [ ] Homeserver URL is shown and understandable enough for a technical beta user.
- [ ] If signed in, sign out is available and does not silently wipe local data without warning.
- [ ] Look for a visible connection/sync status indicator.
- [ ] Flag if the app promises sync but gives no status, progress, or failure state.

## 14. Sharing and Collaboration Claims

- [ ] Open share folder dialog.
- [ ] Copy share link.
- [ ] Follow or inspect the share link behavior if practical.
- [ ] Confirm dialog copy clearly says the link is not an access grant if real sharing is not implemented.
- [ ] Verify shared-room folders cannot be shared again or that disabled controls explain why.
- [ ] Flag any UI that implies real multi-user access when it is only a placeholder link.

## 15. PWA, Offline, and Update UX

- [ ] Browser install/PWA affordance exists if supported by the browser.
- [ ] Manifest/icon/title look correct in install prompt if visible.
- [ ] Offline reload behavior is acceptable after first load.
- [ ] Update prompt copy is understandable if triggered in a preview/staged build.
- [ ] Flag if the app claims install/offline support but gives no visible trust cue.

## 16. Mobile and Responsive Layout

- [ ] Test narrow mobile width.
- [ ] Sidebar is usable or collapses appropriately.
- [ ] Editor header controls do not overflow.
- [ ] Right panel does not permanently cover content without a clear close action.
- [ ] Mobile top controls can switch between Organize, Browse, Write, and Inspect.
- [ ] Dialogs fit on small screens.
- [ ] Note cards/list rows remain readable.
- [ ] Flag any horizontal scrolling, clipped buttons, overlapping text, or unreachable controls.

## 17. Accessibility and Keyboard

- [ ] Primary icon-only controls have labels/tooltips.
- [ ] Keyboard can reach sidebar, new note, command palette, editor actions, dialogs, and settings.
- [ ] Dialog focus is trapped and returns after close.
- [ ] Esc closes dialogs/palette where expected.
- [ ] Visible focus states are present.
- [ ] Destructive menu items are distinguishable from normal actions.
- [ ] Flag if keyboard-only operation gets stuck inside TipTap, source mode, menus, or dialogs.

## 18. Error and Edge States

- [ ] Navigate to a missing `/editor/:noteId` route and verify recovery path.
- [ ] Use very long note titles, folder names, tags, and property values.
- [ ] Try special characters in note titles and export filenames.
- [ ] Create enough notes to require scrolling.
- [ ] Simulate auth server unavailable if practical.
- [ ] Flag if errors are silent, raw, or require console inspection to understand.

## Final Report Format

Use this structure for the tester handoff:

```markdown
# EweNote UX Audit Report

## Environment

- Date:
- Browser:
- Viewports:
- App URL:
- Signed in: yes/no

## Launch Blockers

- [route/screen] Issue, repro steps, expected, actual, screenshot/log

## Trust / Product Gaps

- ...

## Feature Completion Gaps

- ...

## Polish / Layout Issues

- ...

## Console / Network Errors

- ...

## Suggested Fix Launches

- Fix 1:
- Fix 2:
- Fix 3:
```
