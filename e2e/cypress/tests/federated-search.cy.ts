/// <reference types="cypress" />

/**
 * Federated Search smoke test for the micro-example.
 *
 * Prerequisites:
 *   cd examples/federated-search && npm run dev
 *
 * Set the env var FEDERATED_SEARCH_BASE_URL to override the default port:
 *   CYPRESS_FEDERATED_SEARCH_BASE_URL=http://localhost:3091 npx cypress run --spec e2e/cypress/tests/federated-search.cy.ts
 */

const baseUrl =
  Cypress.env('FEDERATED_SEARCH_BASE_URL') ?? 'http://localhost:3091';

describe('federated search micro-example', () => {
  it('health check: both peers are running', () => {
    cy.request(`${baseUrl}/health`).its('body').should('deep.include', {
      status: 'ok',
      peer: 'A',
    });

    cy.request('http://localhost:3092/health')
      .its('body')
      .should('deep.include', { status: 'ok', peer: 'B' });
  });

  it('search returns local and federated results with origin labels', () => {
    cy.request(`${baseUrl}/api/search?q=weather`).then((res) => {
      expect(res.status).to.eq(200);
      const body = res.body;

      // Response must have local and federated sections
      expect(body).to.have.property('local');
      expect(body).to.have.property('federated');
      expect(body.local).to.be.an('array');
      expect(body.federated).to.be.an('array');

      // Local results: should find at least one weather-related result
      expect(body.local.length).to.be.greaterThan(0);
      const localResult = body.local[0];
      expect(localResult).to.have.property('id');
      expect(localResult).to.have.property('documentData');
      expect(localResult.documentData).to.have.property('title');
      // Local result should be from Peer A
      expect(localResult.id).to.match(/^a-/);

      // Federated results: should have one peer entry
      expect(body.federated.length).to.be.greaterThan(0);
      const peerEntry = body.federated[0];

      // Peer entry must have a peer label
      expect(peerEntry).to.have.property('peer');
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      expect(peerEntry.peer).to.be.a('string').and.not.be.empty;
      // Must include the port of Peer B
      expect(peerEntry.peer).to.contain('3092');

      // Federated results from Peer B
      expect(peerEntry.results).to.be.an('array');
      expect(peerEntry.results.length).to.be.greaterThan(0);
      const peerResult = peerEntry.results[0];
      expect(peerResult).to.have.property('id');
      expect(peerResult).to.have.property('documentData');
      expect(peerResult.documentData).to.have.property('title');
      // Peer result should be from Peer B
      expect(peerResult.id).to.match(/^b-/);
    });
  });

  it('search for "federation" returns local match and shows peer section', () => {
    cy.request(`${baseUrl}/api/search?q=federation`).then((res) => {
      expect(res.status).to.eq(200);
      const body = res.body;

      // Local results should contain the Q2 planning note
      const localTitles = body.local.map(
        (r: { documentData: { title: string } }) => r.documentData.title
      );
      expect(localTitles).to.include('Meeting Notes: Q2 Planning');

      // Federated section must still exist with peer label
      expect(body.federated).to.be.an('array');
      expect(body.federated[0]).to.have.property('peer');
    });
  });

  it('demo page loads and renders search UI', () => {
    cy.visit(baseUrl);

    // Page title is visible
    cy.contains('h1', 'Federated Search Demo').should('be.visible');

    // Search input is present
    cy.get('input#query').should('be.visible');

    // Search button is present
    cy.get('button').contains('Search').should('be.visible');
  });

  it('demo page initial search renders results', () => {
    cy.visit(baseUrl);

    // Results load automatically (weather is the default query)
    cy.contains('h2', 'Local Results').should('be.visible');

    // Federated section should be visible
    cy.contains('h2', 'Federated:').should('be.visible');

    // At least one result card is rendered
    cy.get('.result').should('have.length.at.least', 1);

    // Local result title is visible
    cy.contains('.local .result h3', 'Local Weather Report').should(
      'be.visible'
    );

    // Federated result title is visible
    cy.contains('.federated .result h3', 'Weather Tracking System').should(
      'be.visible'
    );
  });

  it('live search updates results when typing a new query', () => {
    cy.visit(baseUrl);

    // Wait for initial results
    cy.contains('h2', 'Local Results').should('be.visible');

    // Clear input and type new query
    cy.get('input#query').clear().type('federation');
    cy.get('button').contains('Search').click();

    // Should show the Q2 planning note locally
    cy.contains('.local .result h3', 'Meeting Notes: Q2 Planning').should(
      'be.visible'
    );
  });
});
