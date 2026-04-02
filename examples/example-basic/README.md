# example-basic

Teaching objective:

- Demonstrate the smallest possible local-first notes app using `@eweser/db` with one default room.
- Show note CRUD, room rename, and share-link generation from a single page.

E2E responsibilities:

- Validate note create/edit/delete behavior.
- Validate returning-user/local persistence behavior after reload.
- Validate share-link modal and copy interaction with deterministic selectors.

Deterministic selector contract:

- App root: `data-cy=\"basic-app-root\"`
- New note button: `data-cy=\"basic-new-note-<roomId>\"`
- Note editor: `data-cy=\"basic-note-editor-<noteId>\"`
- Share button: `data-cy=\"basic-share-button-<roomId>\"`
