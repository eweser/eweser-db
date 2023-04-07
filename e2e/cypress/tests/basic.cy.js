/// <reference types="Cypress" />

describe('Index Page', () => {
  it('should login', () => {
    cy.visit('/');

    cy.contains('Login');
    cy.get('button').click();
    cy.contains('Logging in...');
    cy.contains('Connecting collection...', { timeout: 30000 });
    cy.contains('Edit', { timeout: 30000 });
    cy.contains('Notes');
  });
});
