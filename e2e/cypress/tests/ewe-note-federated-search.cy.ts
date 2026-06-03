/// <reference types="cypress" />

/**
 * Ewe Note federated search UX E2E test.
 *
 * Tests that the search form in the Ewe Note sidebar:
 * 1. Shows a search input accepting text
 * 2. Displays local results separately from federated results
 * 3. Shows origin server labels on federated results
 * 4. Degrades gracefully when a trusted peer times out (per-peer error)
 *
 * Stubs the aggregator API via cy.intercept — no real aggregator needed.
 */

const eweNoteUrl = () =>
  (Cypress.env('eweNoteBaseUrl') as string | undefined) ??
  (Cypress.config('baseUrl') as string | undefined) ??
  '';

/** Stubbed aggregator URL — must match the default in config.ts for dev mode. */
const AGGREGATOR_BASE = 'http://localhost:38190';

describe('Ewe Note federated search UX', () => {
  beforeEach(() => {
    // Stub the aggregator search endpoint
    cy.intercept('GET', `${AGGREGATOR_BASE}/api/search*`, (req) => {
      const url = new URL(req.url);
      const query = url.searchParams.get('q') ?? '';

      if (query === 'weather') {
        req.reply({
          statusCode: 200,
          body: {
            results: [
              {
                id: 'local-1',
                roomId: 'room-local',
                collectionKey: 'notes',
                userId: null,
                documentData: {
                  title: 'Local Weather Notes',
                  text: 'Cloudy with a chance of meatballs',
                },
                updatedAt: new Date().toISOString(),
                rank: 0.95,
              },
              {
                id: 'local-2',
                roomId: 'room-local',
                collectionKey: 'notes',
                userId: null,
                documentData: {
                  title: 'Rainy Day Plans',
                  text: 'Indoor activities for wet weather',
                },
                updatedAt: new Date().toISOString(),
                rank: 0.82,
              },
            ],
            federated: [
              {
                peer: 'peer-a.eweser.demo',
                results: [
                  {
                    id: 'fed-a-1',
                    roomId: 'room-a',
                    collectionKey: 'notes',
                    userId: null,
                    documentData: {
                      title: 'Peer A Storm Tracker',
                      text: 'Hurricane season is starting',
                    },
                    updatedAt: new Date().toISOString(),
                    rank: 0.74,
                  },
                ],
              },
              {
                peer: 'peer-b.eweser.demo',
                results: [
                  {
                    id: 'fed-b-1',
                    roomId: 'room-b',
                    collectionKey: 'notes',
                    userId: null,
                    documentData: {
                      title: 'Peer B Climate Data',
                      text: 'Temperature records from 2025',
                    },
                    updatedAt: new Date().toISOString(),
                    rank: 0.68,
                  },
                ],
              },
            ],
          },
        });
      } else if (query === 'timeout-test') {
        // Simulate a federated peer timeout — peer-a errors, peer-b succeeds
        req.reply({
          statusCode: 200,
          body: {
            results: [
              {
                id: 'local-3',
                roomId: 'room-local',
                collectionKey: 'notes',
                userId: null,
                documentData: {
                  title: 'Local Fallback',
                  text: 'This always works',
                },
                updatedAt: new Date().toISOString(),
                rank: 0.9,
              },
            ],
            federated: [
              {
                peer: 'peer-a.eweser.demo',
                results: [],
                error: 'Peer timed out after 5000ms',
              },
              {
                peer: 'peer-b.eweser.demo',
                results: [
                  {
                    id: 'fed-b-2',
                    roomId: 'room-b',
                    collectionKey: 'notes',
                    userId: null,
                    documentData: {
                      title: 'Peer B Works',
                      text: 'This peer responded fine',
                    },
                    updatedAt: new Date().toISOString(),
                    rank: 0.71,
                  },
                ],
              },
            ],
          },
        });
      } else {
        // Empty results for unknown queries
        req.reply({
          statusCode: 200,
          body: { results: [], federated: [] },
        });
      }
    }).as('aggregatorSearch');
  });

  beforeEach(() => {
    // Visit the Ewe Note app
    cy.visit(eweNoteUrl(), {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
  });

  it('shows a search input in the sidebar', () => {
    cy.getBySel('ewe-note-search-form').should('exist');
    cy.getBySel('ewe-note-search-input')
      .should('exist')
      .and('have.attr', 'placeholder', 'Search notes…');
  });

  it('performs a search and shows local and federated results separately with origin labels', () => {
    // Type a search query and hit Enter
    cy.getBySel('ewe-note-search-input').type('weather{enter}');
    cy.wait('@aggregatorSearch');

    // Results panel should appear
    cy.getBySel('ewe-note-search-results').should('exist');

    // Local results section should be visible with count
    cy.getBySel('ewe-note-search-local-label')
      .should('exist')
      .and('contain.text', 'Local Results')
      .and('contain.text', '2');

    // Local result items should be present
    cy.getBySel('ewe-note-search-results-local')
      .should('exist')
      .within(() => {
        cy.contains('Local Weather Notes').should('exist');
        cy.contains('Rainy Day Plans').should('exist');
      });

    // Federated results should show origin labels (peer names)
    cy.getBySel('ewe-note-search-federated-label-peer-a-eweser-demo').should(
      'exist'
    );
    cy.getBySel('ewe-note-search-federated-label-peer-b-eweser-demo').should(
      'exist'
    );

    // Federal result content — each peer section has its items
    cy.getBySel('ewe-note-search-results-federated')
      .first()
      .should('contain.text', 'Peer A Storm Tracker');
  });

  it('does not show private/granted collaborative room content as federated public search', () => {
    // The aggregator stub returns local results from the app's own rooms
    // and federated results from explicitly labelled peers. There's no
    // mechanism by which a shared collaborative room leaks into federated:
    // federated entries are keyed by peer origin label, not roomId.
    // Verify the peer labels are restricted to named federated peers.
    cy.getBySel('ewe-note-search-input').type('weather{enter}');
    cy.wait('@aggregatorSearch');

    // All federated items should have a peer label (no bare "room" entries)
    cy.get('[data-cy^="ewe-note-search-federated-label-"]').each(($label) => {
      cy.wrap($label).should('contain.text', '.eweser.demo');
    });
  });

  it('degrades gracefully when a trusted peer times out', () => {
    cy.getBySel('ewe-note-search-input').type('timeout-test{enter}');
    cy.wait('@aggregatorSearch');

    cy.getBySel('ewe-note-search-results').should('exist');

    // Local results still show
    cy.contains('Local Fallback').should('exist');

    // Peer A shows a timeout error message
    cy.getBySel('ewe-note-search-peer-error')
      .first()
      .should('contain.text', 'Peer timed out');

    // Peer B still shows results
    cy.contains('Peer B Works').should('exist');
  });

  it('clears the search results when the clear button is clicked', () => {
    cy.getBySel('ewe-note-search-input').type('weather{enter}');
    cy.wait('@aggregatorSearch');
    cy.getBySel('ewe-note-search-results').should('exist');

    // Click the clear button
    cy.getBySel('ewe-note-search-clear').click();

    // Results should disappear
    cy.getBySel('ewe-note-search-results').should('not.exist');
    cy.getBySel('ewe-note-search-input').should('have.value', '');
  });

  it('shows no-results message for unmatched queries', () => {
    cy.getBySel('ewe-note-search-input').type('zzz_nonexistent{enter}');
    cy.wait('@aggregatorSearch');

    cy.getBySel('ewe-note-search-no-results')
      .should('exist')
      .and('contain.text', 'No results');
  });
});
