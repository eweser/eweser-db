/// <reference types="cypress" />

describe('basic share invite flow', () => {
  it('opens share modal and copies generated invite link', () => {
    const inviteLink =
      'http://localhost:38100/access-grant/invite/demo-token?redirect=http://localhost:38110';

    cy.intercept('POST', '**/api/access-grant/create-room-invite', {
      statusCode: 200,
      body: { link: inviteLink },
    }).as('createInvite');

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

    cy.get('button[data-cy^="basic-share-button-"]').first().click();
    cy.wait('@createInvite');

    cy.get('div[data-cy^="basic-share-modal-"]').should('be.visible');
    cy.get('button[data-cy^="basic-share-copy-"]').first().click();

    cy.get('@clipboardWrite').should('have.been.calledWith', inviteLink);
    cy.contains('Copied!').should('exist');
  });
});
