/// <reference types="Cypress" />

describe('Index Page', { baseUrl: 'http://localhost:8600' }, () => {
  const username = 'user' + Math.random().toString(36).substring(7);
  const password = 'password' + Math.random().toString(36).substring(7);
  before(() => {
    localStorage.clear();
  });
  it('should be able to use the app without logging in', () => {
    cy.visit('/');
    cy.contains('Edit');
    cy.contains('Notes');
    cy.contains('Sign out').should('not.exist');

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
    cy.contains('X').click();
    cy.contains('X').click();
  });
  it('should populate online database with notes created during offline mode before logging in', () => {
    cy.visit('/');
    cy.contains('Edit');
    cy.contains('Notes');
    cy.contains('Sign out').should('not.exist');

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

    cy.contains('Sign in').click();
    cy.contains('Sign up').click();
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Sign up').click();
    cy.contains('Edit', { timeout: 30000 });
    cy.contains('Sign out');

    cy.contains('No notes found. Please create one').should('not.exist');

    cy.contains('New Note Body. Hello 2');
    cy.contains('New Note Body. Hello 3');
  });
});
