/// <reference types="Cypress" />

describe('Index Page', () => {
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
  it('should open app right away if credentials exist. It should allow offline editing using localStorage', async () => {
    // if the login credentials and offline database exist in localStorage, allow to open and use the app right away. Send a login and request connect when internet connection is available again
    cy.visit('/');
    cy.contains('Log In');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.contains('no local database found');
    cy.get('button').contains('Log in').click();

    cy.contains('Edit', { timeout: 30000 });

    cy.reload();
    cy.contains('loading local database');

    cy.intercept(
      'http://localhost:8888/_matrix/federation/v1/version',
      (req) => {
        req.reply({ statusCode: 500 });
      }
    ); // the ping endpoint that the app uses to determine online/offline
    cy.contains('Log In').should('not.exist');
    cy.contains('Edit');
    cy.intercept(
      'http://localhost:8888/_matrix/federation/v1/version',
      (req) => {
        req.reply({ success: true });
      }
    );
    cy.contains('connecting remote server...');
    cy.contains('remote server connected. syncing...');
    cy.contains('remote server synced');
  });
  it('shows error on incorrect login info', () => {
    cy.visit('/');

    cy.contains('Log In');
    cy.contains('Invalid username or password').should('not.exist');
    cy.contains('Password');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type('wrong password');
    cy.get('button').contains('Log in').click();
    cy.contains('Invalid username or password');
  });
  it('reconnects automatically when internet connection is lost and regained', () => {
    cy.visit('/');
    cy.contains('Log In');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Log in').click();

    cy.contains('Edit', { timeout: 30000 });
    cy.contains('online');
    cy.intercept(
      'http://localhost:8888/_matrix/federation/v1/version',
      (req) => {
        req.reply({ statusCode: 500 });
      }
    );
    cy.contains('offline', { timeout: 20000 });
    cy.intercept(
      'http://localhost:8888/_matrix/federation/v1/version',
      (req) => {
        req.reply({ statusCode: 200 });
      }
    );
    cy.contains('reconnecting to remote');
    cy.contains('online');
    cy.contains('reconnected to remote', { timeout: 20000 });
  });
});
