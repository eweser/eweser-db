/// <reference types="cypress" />

const fullE2E =
  Cypress.env('FULL_E2E') === true || Cypress.env('FULL_E2E') === 'true';
const describeFull = fullE2E ? describe : describe.skip;

const multiRoomBaseUrl =
  Cypress.env('MULTI_ROOM_BASE_URL') ?? 'http://localhost:38120';

describeFull('multi-room toy app', () => {
  it('creates multiple rooms and keeps room-scoped note state', () => {
    const roomName = `Project-${Date.now()}`;
    const roomNote = `room-note-${Date.now()}`;

    cy.visit(multiRoomBaseUrl, {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });

    cy.getBySel('multi-room-app-root').should('exist');

    cy.getBySel('multi-room-name-input').type(roomName);
    cy.getBySel('multi-room-create-button').click();

    cy.contains('button', roomName).click();
    cy.get('button[data-cy^="multi-room-new-note-"]').first().click();
    cy.get('textarea[data-cy^="multi-room-note-editor-"]')
      .first()
      .clear()
      .type(roomNote);

    cy.contains('button', 'Default Notes Room').click();
    cy.contains(roomNote).should('not.exist');

    cy.contains('button', roomName).click();
    cy.contains(roomNote).should('exist');
  });
});
