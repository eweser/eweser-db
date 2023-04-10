/// <reference types="Cypress" />

describe('Index Page', { baseUrl: 'http://localhost:8082' }, () => {
  it('should login', () => {
    cy.visit('/');

    cy.get('button').contains('Log in').click();

    cy.contains('Edit', { timeout: 30000 });
    cy.contains('Notes');
  });
});
