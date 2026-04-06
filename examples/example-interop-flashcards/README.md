# example-interop-flashcards

Teaching objective:

- Demonstrate app-to-app interop from the flashcards side.
- Show linked note references resolved in a separate app using shared room data.

E2E responsibilities:

- Validate flashcard CRUD behavior in the shared interop room.
- Validate linked note data appears for flashcards created from notes app.
- Validate reveal-answer behavior with deterministic selectors.

Deterministic selector contract:

- App root: `data-cy=\"interop-flashcards-app-root\"`
- New flashcard button: `data-cy=\"interop-flashcards-new\"`
- Reveal answer button: `data-cy=\"interop-flashcard-reveal-<flashcardId>\"`
