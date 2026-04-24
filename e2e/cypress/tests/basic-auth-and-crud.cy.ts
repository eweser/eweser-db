/// <reference types="cypress" />

function getNotesRoomId() {
  return cy.window().then((win) => {
    const roomId = win.localStorage.getItem('ks-notes-room-id');
    expect(typeof roomId, 'notes room id').to.equal('string');
    expect(roomId, 'notes room id').to.not.equal('');
    return roomId as string;
  });
}

describe('basic auth entry and note CRUD', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('shows auth entrypoint and supports create/edit/delete note flow', () => {
    getNotesRoomId().then((notesRoomId) => {
      cy.getBySel('basic-app-root').should('exist');
      cy.getBySel('basic-login-button').should('exist');

      // Notes tab is active by default
      cy.getBySel('basic-notes-tab').should('exist');

      cy.getBySel(`basic-new-note-${notesRoomId}`).click();
      cy.get('textarea[data-cy^="basic-note-editor-"]')
        .first()
        .type(' hello-world')
        .should('contain.value', 'hello-world');

      cy.get('button[data-cy^="basic-delete-note-"]').first().click();
      cy.getBySel(`basic-empty-state-${notesRoomId}`).should('exist');
    });
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

  it('renames the default room and keeps the title after reload', () => {
    const renamedRoom = `Renamed notes ${Date.now()}`;

    getNotesRoomId().then((notesRoomId) => {
      cy.getBySel(`basic-room-name-${notesRoomId}`).click();
      cy.getBySel(`basic-room-name-input-${notesRoomId}`)
        .clear()
        .type(renamedRoom)
        .type('{enter}');

      cy.getBySel(`basic-room-select-${notesRoomId}`).should(
        'contain.text',
        renamedRoom
      );

      cy.reload();

      cy.getBySel(`basic-room-select-${notesRoomId}`).should(
        'contain.text',
        renamedRoom
      );
    });
  });
});
