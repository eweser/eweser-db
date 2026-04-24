/// <reference types="cypress" />

const fullE2E =
  Cypress.env('FULL_E2E') === true || Cypress.env('FULL_E2E') === 'true';
const describeFull = fullE2E ? describe : describe.skip;

const multiRoomBaseUrl =
  Cypress.env('MULTI_ROOM_BASE_URL') ?? 'http://localhost:38120';

function getStoredRoomId(key: string) {
  return cy.window().then((win) => {
    const roomId = win.localStorage.getItem(key);
    expect(typeof roomId, `${key} room id`).to.equal('string');
    expect(roomId, `${key} room id`).to.not.equal('');
    return roomId as string;
  });
}

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

    getStoredRoomId('multi-room-default-id').then((defaultRoomId) => {
      cy.getBySel('multi-room-name-input').type(roomName);
      cy.getBySel('multi-room-create-button').click();

      cy.contains('button', roomName)
        .should('have.attr', 'data-cy')
        .then((dataCy) => {
          expect(dataCy).to.match(/^multi-room-select-/);
          const roomId = String(dataCy).replace('multi-room-select-', '');

          cy.getBySel(`multi-room-select-${roomId}`).click();
          cy.getBySel(`multi-room-panel-${roomId}`).should('exist');
          cy.getBySel(`multi-room-new-note-${roomId}`).click();
          cy.get('textarea[data-cy^="multi-room-note-editor-"]')
            .first()
            .clear()
            .type(roomNote);

          cy.getBySel(`multi-room-select-${defaultRoomId}`).click();
          cy.contains(roomNote).should('not.exist');

          cy.getBySel(`multi-room-select-${roomId}`).click();
          cy.contains(roomNote).should('exist');
        });
    });
  });
});
