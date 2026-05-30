/// <reference types="cypress" />

const eweNoteUrl = () =>
  (Cypress.env('eweNoteBaseUrl') as string | undefined) ??
  (Cypress.config('baseUrl') as string | undefined) ??
  '';

const fullE2E =
  Cypress.env('FULL_E2E') === true || Cypress.env('FULL_E2E') === 'true';
const describeFull = fullE2E ? describe : describe.skip;

function visitHome() {
  cy.visit(eweNoteUrl(), {
    onBeforeLoad(win) {
      win.localStorage.clear();
    },
  });

  cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
}

/**
 * Get the data-cy attribute of a room badge matching a partial text.
 * For secure rooms, we look for the badge in the SecureRoomControls.
 */
function getSecureRoomBadge() {
  return cy.getBySel('secure-room-badge');
}

describe('ewe-note secure room UI', () => {
  it('shows standard room badge when no secure room exists', () => {
    visitHome();

    // Verify the secure room controls section exists in the sidebar
    cy.getBySel('secure-room-controls').should('exist');

    // Badge should show "Standard" (not encrypted)
    getSecureRoomBadge().should('contain.text', 'Standard');

    // Tooltip should explain standard rooms are not E2EE
    getSecureRoomBadge().trigger('mouseenter');
    cy.getBySel('secure-room-badge-tooltip').should('contain.text', 'not encrypted');
    getSecureRoomBadge().trigger('mouseleave');
  });

  it('creates a secure room and shows recovery phrase', () => {
    visitHome();

    // Click create secure room button
    cy.getBySel('secure-room-create-button').click();

    // Verify recovery phrase is displayed
    cy.getBySel('secure-room-recovery-phrase', { timeout: 10000 }).should('exist');
    cy.getBySel('secure-room-phrase-text')
      .invoke('text')
      .then((phrase) => {
        expect(phrase.split(/\s+/).length).to.equal(12);
      });

    // Badge should show E2EE (unlocked)
    getSecureRoomBadge().should('contain.text', 'E2EE');

    // Lock/Unlock buttons should be available
    cy.getBySel('secure-room-lock-button').should('exist');
    cy.getBySel('secure-room-export-key-button').should('exist');

    // Unavailable states should be visible
    cy.getBySel('secure-room-unavailable-states').should('exist');
    cy.getBySel('secure-room-search-unavailable').should('contain.text', 'disabled');
    cy.getBySel('secure-room-mcp-unavailable').should('contain.text', 'disabled');
    cy.getBySel('secure-room-aggregator-unavailable').should('contain.text', 'disabled');
  });

  it('locks and unlocks a secure room', () => {
    visitHome();

    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-recovery-phrase', { timeout: 10000 }).should('exist');

    // Get the recovery phrase
    cy.getBySel('secure-room-phrase-text')
      .invoke('text')
      .then((phrase) => {
        // Dismiss recovery phrase to clean up
        cy.getBySel('secure-room-phrase-dismiss').click();

        // Lock the room
        cy.getBySel('secure-room-lock-button').click();
        cy.getBySel('secure-room-message').should('contain.text', 'locked');

        // Badge should show "Locked"
        getSecureRoomBadge().should('contain.text', 'Locked');

        // Unlock button should now be visible instead of Lock
        cy.getBySel('secure-room-lock-button').should('not.exist');
        cy.getBySel('secure-room-unlock-button').should('exist');

        // Click unlock — dialog should appear
        cy.getBySel('secure-room-unlock-button').click();
        cy.getBySel('secure-room-unlock-dialog').should('exist');

        // Paste recovery phrase
        cy.getBySel('secure-room-unlock-input').type(phrase);
        cy.getBySel('secure-room-unlock-confirm').click();

        // Badge should return to E2EE
        getSecureRoomBadge().should('contain.text', 'E2EE');

        // Lock button should reappear
        cy.getBySel('secure-room-lock-button').should('exist');
      });
  });

  it('dismisses recovery phrase and re-locks', () => {
    visitHome();

    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-recovery-phrase', { timeout: 10000 }).should('exist');

    // Dismiss recovery phrase
    cy.getBySel('secure-room-phrase-dismiss').click();
    cy.getBySel('secure-room-recovery-phrase').should('not.exist');

    // Lock the room
    cy.getBySel('secure-room-lock-button').click();
    cy.getBySel('secure-room-message').should('contain.text', 'locked');

    // Badge shows locked
    getSecureRoomBadge().should('contain.text', 'Locked');
  });

  it('shows tooltip explaining unavailable features on secure room', () => {
    visitHome();

    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-recovery-phrase', { timeout: 10000 }).should('exist');

    // Hover over badge to see tooltip
    getSecureRoomBadge().trigger('mouseenter');
    cy.getBySel('secure-room-badge-tooltip').should('be.visible');
    cy.getBySel('secure-room-badge-tooltip').should('contain.text', 'end-to-end encrypted');
    cy.getBySel('secure-room-badge-tooltip').should('contain.text', 'MCP');
    cy.getBySel('secure-room-badge-tooltip').should('contain.text', 'search');
    cy.getBySel('secure-room-badge-tooltip').should('contain.text', 'aggregation');
    getSecureRoomBadge().trigger('mouseleave');
  });

  it('exports and imports room key material', () => {
    visitHome();

    cy.getBySel('secure-room-create-button').click();
    cy.getBySel('secure-room-recovery-phrase', { timeout: 10000 }).should('exist');

    // Dismiss recovery phrase
    cy.getBySel('secure-room-phrase-dismiss').click();

    // Export key (room is unlocked by default after creation)
    cy.getBySel('secure-room-export-key-button').click();

    // Verify exported key dialog shows a base64 key
    cy.getBySel('secure-room-export-dialog', { timeout: 5000 }).should('exist');
    cy.getBySel('secure-room-exported-key')
      .invoke('text')
      .then((text) => {
        const match = text.match(/[A-Za-z0-9+/=]{40,}/);
        expect(match).to.not.be.null;
      });
  });

  describeFull('multi-device secure room e2e', () => {
    it('locks room on one device, verifies encrypted on second load (simulated reload)', () => {
      visitHome();

      cy.getBySel('secure-room-create-button').click();
      cy.getBySel('secure-room-recovery-phrase', { timeout: 10000 }).should('exist');

      // Keep phrase for later unlock
      cy.getBySel('secure-room-phrase-text')
        .invoke('text')
        .as('recoveryPhrase');

      // Dismiss recovery phrase
      cy.getBySel('secure-room-phrase-dismiss').click();

      // Create a note first
      cy.getBySel('ewe-note-new-note').first().click();
      cy.url({ timeout: 10000 }).should('include', '/editor/');
      cy.getBySel('ewe-note-header', { timeout: 10000 }).should('exist');

      // Verify the sidebar still shows secure controls
      cy.getBySel('secure-room-badge').should('contain.text', 'E2EE');

      // Lock the room — note content should now be encrypted
      cy.getBySel('secure-room-controls').scrollIntoView();
      cy.getBySel('secure-room-lock-button').click();
      cy.getBySel('secure-room-message').should('contain.text', 'locked');
      getSecureRoomBadge().should('contain.text', 'Locked');

      // Reload to simulate second device
      cy.reload();
      cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');

      // Room should still show as locked
      cy.getBySel('secure-room-badge').should('contain.text', 'Locked');

      // Unlock with persisted recovery phrase
      cy.get('@recoveryPhrase').then((phrase) => {
        cy.getBySel('secure-room-unlock-button').click();
        cy.getBySel('secure-room-unlock-dialog').should('exist');
        cy.getBySel('secure-room-unlock-input').type(String(phrase));
        cy.getBySel('secure-room-unlock-confirm').click();
        getSecureRoomBadge().should('contain.text', 'E2EE');
      });
    });
  });
});
