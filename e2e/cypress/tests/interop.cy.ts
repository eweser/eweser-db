/// <reference types="cypress" />

const fullE2E =
  Cypress.env('FULL_E2E') === true || Cypress.env('FULL_E2E') === 'true';
const describeFull = fullE2E ? describe : describe.skip;

const notesBaseUrl =
  Cypress.env('INTEROP_NOTES_BASE_URL') ?? 'http://localhost:38130';
const flashcardsBaseUrl =
  Cypress.env('INTEROP_FLASHCARDS_BASE_URL') ?? 'http://localhost:38140';

describeFull('interop app pair', () => {
  it('creates linked data in notes app and validates in flashcards app', () => {
    const noteText = `interop-note-${Date.now()}`;

    cy.visit(notesBaseUrl, {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.getBySel('interop-notes-app-root').should('exist');
    cy.getBySel('interop-notes-new-note').click();
    cy.get('textarea[data-cy^="interop-notes-editor-"]')
      .first()
      .clear()
      .type(noteText);
    cy.get('button[data-cy^="interop-notes-link-flashcard-"]').first().click();

    cy.visit(flashcardsBaseUrl);
    cy.getBySel('interop-flashcards-app-root').should('exist');

    cy.get('p[data-cy^="interop-flashcard-linked-note-"]', { timeout: 20000 })
      .contains(noteText)
      .should('exist');

    cy.get('button[data-cy^="interop-flashcard-reveal-"]').first().click();
    cy.get('p[data-cy^="interop-flashcard-back-"]').first().should('exist');
  });
});
