/// <reference types="Cypress" />

describe('Index Page', { baseUrl: 'http://localhost:8111' }, () => {
  const username = 'user' + Math.random().toString(36).substring(7);
  const password = 'password' + Math.random().toString(36).substring(7);
  it('should register user', () => {
    cy.visit('/');
    cy.contains('Sign up').click();
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Sign up').click();
    cy.contains('Edit', { timeout: 30000 });

    cy.contains('No notes found. Please create one');
  });
  it('should login, create, edit, delete notes', () => {
    cy.visit('/');

    cy.contains('Log In');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Log in').click();

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
    cy.contains('X').click();
    cy.contains('X').click();
  });
  // test is too flaky, but generally works on local
  it.skip('should allow creating and switching between rooms(collections)', () => {
    cy.visit('/');

    cy.contains('Log In');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Log in').click();

    cy.contains('No notes found. Please create one');
    cy.contains('New note').click();
    cy.contains('New Note Body');
    cy.get('textarea').type('. Hello collection 1');
    cy.findAllByText('New Note Body. Hello collection 1').should(
      'have.length',
      2
    );

    cy.contains('New Collection').click();
    cy.get('input[name=new-room-name]').type('Collection2');
    cy.contains('Create Collection').click();
    // cy.contains('Create Collection').should('not.exist', { timeout: 30000 });

    // cy.contains('No notes found. Please create one');
    // cy.contains('New note').click();
    // cy.contains('New Note Body');
    // strangely, cypress seems to skip ahead to these steps, so that after create collection, it's already got 'say hello collection 2' in the textarea
    cy.get('textarea').clear();
    cy.contains('New Note Body. Hello collection 1').should('not.exist');
    cy.get('textarea').type('Say Hello collection 2');
    cy.findAllByText('Say Hello collection 2').should('have.length', 2);
    cy.contains('New Note Body. Hello collection 1').should('not.exist');

    cy.contains('notes-default').click();
    cy.contains('New Note Body. Hello collection 1');
    cy.findAllByText('New Note Body. Hello collection 1').should(
      'have.length',
      2
    );
    cy.contains('Say Hello collection 2').should('not.exist');

    cy.contains('collection2').click();

    cy.findAllByText('Say Hello collection 2').should('have.length', 2);
    cy.contains('Say Hello collection 2');
    cy.contains('New Note Body. Hello collection 1').should('not.exist');
  });
});
