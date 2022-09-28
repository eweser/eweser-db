/// <reference types="Cypress" />

describe('Index Page', () => {
  it('should login', () => {
    cy.visit('/');

    cy.contains('Login');
    cy.get('button').click();
    cy.contains('Logging in...');
    cy.contains('Connecting collection...');
    cy.contains('Edit');
    cy.contains('Notes');
  });
});
