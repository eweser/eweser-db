/// <reference types="cypress" />

describe('basic share invite flow', () => {
  it('opens share modal and copies generated invite link', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        if (!win.navigator.clipboard) {
          Object.defineProperty(win.navigator, 'clipboard', {
            value: { writeText: () => Promise.resolve() },
            configurable: true,
          });
        }
        cy.stub(win.navigator.clipboard, 'writeText').as('clipboardWrite');
      },
    });

    // Notes tab is active by default with share buttons
    cy.getBySel('basic-notes-tab').should('exist');

    cy.get('button[data-cy^="basic-share-button-"]').first().click();
    cy.get('div[data-cy^="basic-share-modal-"]').should('be.visible');
    cy.get('button[data-cy^="basic-share-copy-"]').first().click();

    cy.get('@clipboardWrite').should('have.been.called');
    cy.contains('Copied!').should('exist');
  });
});
