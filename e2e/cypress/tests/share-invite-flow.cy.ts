/// <reference types="cypress" />

function getNotesRoomId() {
  return cy.window().then((win) => {
    const roomId = win.localStorage.getItem('ks-notes-room-id');
    expect(typeof roomId, 'notes room id').to.equal('string');
    expect(roomId, 'notes room id').to.not.equal('');
    return roomId as string;
  });
}

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

    getNotesRoomId().then((notesRoomId) => {
      // Notes tab is active by default with share buttons
      cy.getBySel('basic-notes-tab').should('exist');

      cy.getBySel(`basic-share-button-${notesRoomId}`).click();
      cy.getBySel(`basic-share-modal-${notesRoomId}`).should('be.visible');
      cy.getBySel(`basic-share-copy-${notesRoomId}`).click();

      cy.get('@clipboardWrite').should('have.been.called');
      cy.contains('Copied!').should('exist');
    });
  });
});
