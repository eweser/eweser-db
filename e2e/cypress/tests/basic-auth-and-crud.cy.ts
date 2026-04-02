/// <reference types="cypress" />

describe('basic auth entry and note CRUD', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('shows auth entrypoint and supports create/edit/delete note flow', () => {
    cy.getBySel('basic-app-root').should('exist');
    cy.contains('Login').should('exist');

    // Notes tab is active by default
    cy.getBySel('basic-notes-tab').should('exist');

    cy.get('button[data-cy^="basic-new-note-"]').first().click();
    cy.get('textarea[data-cy^="basic-note-editor-"]')
      .first()
      .type(' hello-world')
      .should('contain.value', 'hello-world');

    cy.get('button[data-cy^="basic-delete-note-"]').first().click();
    cy.contains('No notes found').should('exist');
  });

  it('can switch tabs to flashcards, profile, and status', () => {
    cy.getBySel('basic-tab-flashcards').click();
    cy.getBySel('basic-flashcards-tab').should('exist');

    cy.getBySel('basic-tab-profile').click();
    cy.getBySel('basic-profile-tab').should('exist');

    cy.getBySel('basic-tab-status').click();
    cy.getBySel('basic-status-tab').should('exist');

    cy.getBySel('basic-tab-notes').click();
    cy.getBySel('basic-notes-tab').should('exist');
  });
});
