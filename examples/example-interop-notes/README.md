# example-interop-notes

Teaching objective:
- Demonstrate app-to-app interop from the notes side.
- Show how a notes app can create linked flashcards by storing references.

E2E responsibilities:
- Validate note CRUD behavior in a shared interop room.
- Validate creating a linked flashcard reference from notes.
- Validate linked flashcard metadata is visible in notes UI.

Deterministic selector contract:
- App root: `data-cy=\"interop-notes-app-root\"`
- New note button: `data-cy=\"interop-notes-new-note\"`
- Link flashcard button: `data-cy=\"interop-notes-link-flashcard-<noteId>\"`
