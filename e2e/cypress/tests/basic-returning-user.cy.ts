/// <reference types="cypress" />

describe('basic returning user', () => {
  it('loads previous local-first notes after reload', () => {
    const noteText = `persisted-${Date.now()}`;

    cy.visit('/');
    cy.getBySel('basic-app-root').should('exist');

    // Notes tab is active by default
    cy.getBySel('basic-notes-tab').should('exist');

    cy.get('button[data-cy^="basic-new-note-"]').first().click();
    cy.get('textarea[data-cy^="basic-note-editor-"]')
      .first()
      .clear()
      .type(noteText);

    cy.reload();
    cy.getBySel('basic-app-root').should('exist');
    cy.getBySel('basic-notes-tab').should('exist');
    cy.contains(noteText).should('exist');
  });
});
