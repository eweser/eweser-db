/// <reference types="Cypress" />

describe('Index Page', () => {
  it('should login', () => {
    cy.visit('/');

    cy.contains('Login');
    cy.get('button').click();
  });
});
