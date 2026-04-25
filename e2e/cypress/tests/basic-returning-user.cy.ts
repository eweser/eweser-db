/// <reference types="cypress" />

function getNotesRoomId() {
  return cy.window().then((win) => {
    const roomId = win.localStorage.getItem('ks-notes-room-id');
    expect(typeof roomId, 'notes room id').to.equal('string');
    expect(roomId, 'notes room id').to.not.equal('');
    return roomId as string;
  });
}

describe('basic returning user', () => {
  it('loads previous local-first notes after reload', () => {
    const noteText = `persisted-${Date.now()}`;

    cy.visit('/');

    getNotesRoomId().then((notesRoomId) => {
      cy.getBySel('basic-app-root').should('exist');

      // Notes tab is active by default
      cy.getBySel('basic-notes-tab').should('exist');

      cy.getBySel(`basic-new-note-${notesRoomId}`).click();
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
});
