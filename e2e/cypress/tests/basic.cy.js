/// <reference types="Cypress" />

describe('Index Page', () => {
  it('should login', () => {
    cy.visit('/');

    cy.contains('Login');
    cy.get('button').click();
    cy.contains('Logging in...');
    // cy.contains('Connecting collection...', { timeout: 30000 });
    // logged in and loaded
    cy.contains('Edit', { timeout: 30000 });
    cy.contains('Notes');

    cy.contains('No notes found. Please create one');
    cy.contains('New note').click();
    cy.contains('New Note Body');
    cy.get('textarea').type('. Hello World');
    cy.contains('New Note Body. Hello World');
    cy.contains('X').click();
    cy.contains('No notes found. Please create one');

    cy.contains('New note').click();
    cy.contains('New Note Body');
    cy.get('textarea').type('. Hello 2');
    cy.contains('New Note Body. Hello 2');
    cy.contains('New note').click();
    cy.get('textarea').type('. Hello 3');
    cy.contains('New Note Body. Hello 2');
    cy.contains('New Note Body. Hello 3');
  });
});
