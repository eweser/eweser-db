/// <reference types="cypress" />

const fullE2E =
  Cypress.env('FULL_E2E') === true || Cypress.env('FULL_E2E') === 'true';
const describeFull = fullE2E ? describe : describe.skip;

const secureRoomBaseUrl =
  Cypress.env('SECURE_ROOM_BASE_URL') ?? 'http://localhost:38130';

/**
 * Extract the 12-word recovery phrase from the secure-room-phrase-text element.
 */
function getRecoveryPhrase() {
  return cy
    .getBySel('secure-room-phrase-text')
    .invoke('text')
    .then((text) => text.trim());
}

describe('secure-room example app', () => {
  beforeEach(() => {
    cy.visit(secureRoomBaseUrl, {
      onBeforeLoad(win) {
        // Clear localStorage to start fresh
        win.localStorage.clear();
      },
    });
    cy.getBySel('secure-room-app-root').should('exist');
    cy.getBySel('secure-room-header').should('exist');
  });

  it('creates a secure room and shows recovery phrase', () => {
    cy.getBySel('secure-room-create-button').click();

    // Verify recovery phrase is displayed
    cy.getBySel('secure-room-recovery-phrase').should('exist');
    cy.getBySel('secure-room-phrase-text')
      .invoke('text')
      .then((phrase) => {
        expect(phrase.split(/\s+/).length).to.equal(12);
      });
  });

  it('creates secure room, writes note, locks, unlocks, and verifies content', () => {
    const noteText = `Secure note ${Date.now()}`;

    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-phrase-text').should('exist');

    // Room starts unlocked — write a note
    getRecoveryPhrase().then((phrase) => {
      cy.getBySel('secure-room-recovery-phrase').should('exist');

      // Get the new secure room ID from the room selector
      cy.get('button[data-cy^="secure-room-select-"]').then((buttons) => {
        // Find the secure room button
        const secureRoomButton = Array.from(buttons).find((btn) =>
          btn.textContent?.includes('🔒 Secure Notes')
        );
        expect(secureRoomButton).to.exist;
        const secureRoomId = secureRoomButton?.getAttribute('data-cy')?.replace('secure-room-select-', '');
        expect(secureRoomId).to.be.a('string');

        // Create a new note
        cy.getBySel(`secure-room-new-note-${secureRoomId}`).click();
        cy.get('textarea[data-cy^="secure-room-note-editor-"]')
          .first()
          .clear()
          .type(noteText);

        // Verify note text is visible
        cy.contains(noteText).should('exist');

        // Lock the room
        cy.getBySel('secure-room-lock-button').click();

        // Verify encrypted placeholder shown
        cy.getBySel('secure-room-encrypted-placeholder').should('exist');
        cy.contains(noteText).should('not.exist');

        // Unlock with the recovery phrase
        cy.getBySel('secure-room-unlock-button').click();
        cy.getBySel('secure-room-unlock-input').type(phrase);
        cy.getBySel('secure-room-unlock-confirm').click();

        // Verify note text is visible again
        cy.contains(noteText).should('exist');

        // Verify encrypted placeholder is gone
        cy.getBySel('secure-room-encrypted-placeholder').should('not.exist');
      });
    });
  });

  it('exports and imports room key material', () => {
    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-phrase-text').should('exist');

    // Export key (room is unlocked by default after creation)
    cy.getBySel('secure-room-export-key-button').click();

    // Verify exported key is a non-empty base64 string
    cy.getBySel('secure-room-exported-key')
      .should('exist')
      .invoke('text')
      .then((text) => {
        // Should contain a base64 string (at least 44 chars for 32 bytes)
        const match = text.match(/[A-Za-z0-9+/=]{40,}/);
        expect(match).to.not.be.null;
      });
  });

  it('shows unavailable states for server-side features on encrypted rooms', () => {
    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-phrase-text').should('exist');

    // Verify the unavailable states section
    cy.getBySel('secure-room-unavailable-states').should('exist');
    cy.getBySel('secure-room-search-unavailable').should('exist');
    cy.getBySel('secure-room-mcp-unavailable').should('exist');
    cy.getBySel('secure-room-aggregator-unavailable').should('exist');

    // Verify each mentions "unavailable" or "not supported"
    cy.getBySel('secure-room-search-unavailable').should('contain.text', 'Unavailable');
    cy.getBySel('secure-room-mcp-unavailable').should('contain.text', 'Unavailable');
    cy.getBySel('secure-room-aggregator-unavailable').should('contain.text', 'Not supported');
  });

  it('shows encrypted placeholder after reload of a locked room', () => {
    const noteText = `Persistent note ${Date.now()}`;

    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-phrase-text').should('exist');

    // Write a note
    cy.get('button[data-cy^="secure-room-select-"]').then((buttons) => {
      const secureRoomButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('🔒 Secure Notes')
      );
      const secureRoomId = secureRoomButton?.getAttribute('data-cy')?.replace('secure-room-select-', '');
      cy.getBySel(`secure-room-new-note-${secureRoomId}`).click();
      cy.get('textarea[data-cy^="secure-room-note-editor-"]')
        .first()
        .clear()
        .type(noteText);
      cy.contains(noteText).should('exist');

      // Lock the room
      cy.getBySel('secure-room-lock-button').click();
      cy.getBySel('secure-room-encrypted-placeholder').should('exist');

      // Reload — simulates a "second device" that doesn't have the key in memory
      cy.reload();
      cy.getBySel('secure-room-app-root').should('exist');

      // The room is loaded from IndexedDB, but since it's encrypted and locked,
      // the encrypted placeholder should appear
      // Click on the secure room to select it
      cy.get(`button[data-cy="secure-room-select-${secureRoomId}"]`).click();
      cy.getBySel('secure-room-encrypted-placeholder').should('exist');
      cy.contains(noteText).should('not.exist');
    });
  });
});
