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

    cy.get('button[data-cy^="basic-new-note-"]').first().click();
    cy.get('textarea[data-cy^="basic-note-editor-"]').first().type(' hello-world');

    cy.get('p[data-cy^="basic-note-text-"]').contains('hello-world').should('exist');

    cy.get('button[data-cy^="basic-delete-note-"]').first().click();
    cy.contains('No notes found. Please create one').should('exist');
  });
});
