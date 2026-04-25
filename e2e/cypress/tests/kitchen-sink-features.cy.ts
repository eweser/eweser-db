/// <reference types="cypress" />

describe('kitchen-sink: multi-room', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('basic-notes-tab').should('exist');
    // New room creation can throw transient "no documents" while ydoc initialises
    cy.on('uncaught:exception', (err) => {
      if (err.message.includes('no documents')) return false;
    });
  });

  it('creates a second room and switches between them', () => {
    cy.window().then((win) => {
      const defaultRoomId = win.localStorage.getItem('ks-notes-room-id');
      expect(typeof defaultRoomId, 'default notes room id').to.equal('string');
      expect(defaultRoomId, 'default notes room id').to.not.equal('');

      // Create a new room
      cy.getBySel('basic-new-room-input').type('Work Notes');
      cy.getBySel('basic-create-room-button').click();

      // Should show both rooms in the list
      cy.getBySel('basic-room-list').within(() => {
        cy.get('button').should('have.length.at.least', 2);
      });

      cy.contains('button', 'Work Notes')
        .should('have.attr', 'data-cy')
        .then((dataCy) => {
          const roomId = String(dataCy).replace('basic-room-select-', '');

          cy.getBySel(`basic-room-select-${roomId}`).click();
          cy.getBySel(`basic-room-${roomId}`).should('exist');

          cy.getBySel(`basic-new-note-${roomId}`).click();
          cy.get('textarea[data-cy^="basic-note-editor-"]')
            .first()
            .clear()
            .type('work note content');

          cy.getBySel(`basic-room-select-${String(defaultRoomId)}`).click();
          cy.contains('work note content').should('not.exist');

          cy.getBySel(`basic-room-select-${roomId}`).click();
          cy.contains('work note content').should('exist');
        });
    });
  });
});

describe('kitchen-sink: flashcards', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('creates and reveals a flashcard', () => {
    cy.getBySel('basic-tab-flashcards').click();
    cy.getBySel('basic-flashcards-tab').should('exist');

    cy.getBySel('basic-new-flashcard').click();
    cy.get('[data-cy^="basic-flashcard-front-"]').should('exist');
    cy.get('[data-cy^="basic-flashcard-reveal-"]').first().click();
    cy.get('[data-cy^="basic-flashcard-back-"]').should('exist');
  });

  it('deletes a flashcard', () => {
    cy.getBySel('basic-tab-flashcards').click();
    cy.getBySel('basic-new-flashcard').click();
    cy.get('[data-cy^="basic-flashcard-card-"]').should('have.length', 1);

    cy.get('[data-cy^="basic-flashcard-delete-"]').first().click();
    cy.getBySel('basic-flashcards-empty').should('exist');
  });
});

describe('kitchen-sink: cross-collection linking', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('creates a linked flashcard from a note', () => {
    // Create a note first
    cy.get('button[data-cy^="basic-new-note-"]').first().click();

    // Click "Create flashcard" on the note card
    cy.get('button[data-cy^="basic-link-flashcard-"]').first().click();

    // Should show "1 linked" on the note card
    cy.contains('1 linked').should('exist');

    // Switch to flashcards tab to see the linked flashcard was created
    cy.getBySel('basic-tab-flashcards').click();
    cy.get('[data-cy^="basic-flashcard-card-"]').should('have.length', 1);
    // The flashcard front text should reference the note
    cy.get('[data-cy^="basic-flashcard-front-"]')
      .first()
      .should('contain.text', 'Q:');
  });
});

describe('kitchen-sink: profile', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('creates and saves a profile', () => {
    cy.getBySel('basic-tab-profile').click();
    cy.getBySel('basic-profile-tab').should('exist');

    cy.getBySel('basic-profile-first-name').type('Alice');
    cy.getBySel('basic-profile-last-name').type('Smith');
    cy.getBySel('basic-profile-save').click();

    cy.getBySel('basic-profile-saved').should('contain', 'Alice Smith');
  });

  it('profile persists after reload', () => {
    cy.getBySel('basic-tab-profile').click();
    cy.getBySel('basic-profile-first-name').type('Bob');
    cy.getBySel('basic-profile-last-name').type('Jones');
    cy.getBySel('basic-profile-save').click();

    cy.reload();
    cy.getBySel('basic-tab-profile').click();
    cy.getBySel('basic-profile-first-name').should('have.value', 'Bob');
    cy.getBySel('basic-profile-last-name').should('have.value', 'Jones');
  });
});

describe('kitchen-sink: status tab', () => {
  it('shows system status with room information', () => {
    cy.visit('/');
    cy.getBySel('basic-tab-status').click();
    cy.getBySel('basic-status-tab').should('exist');

    // Should show at least the 3 initial rooms
    cy.get('[data-cy^="basic-status-room-"]').should('have.length.at.least', 3);

    // Should show the feature checklist
    cy.contains('Offline-first').should('exist');
    cy.contains('Multi-room').should('exist');
    cy.contains('Cross-collection refs').should('exist');
  });
});
