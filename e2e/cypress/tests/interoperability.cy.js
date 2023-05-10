/// <reference types="Cypress" />

const username = 'the-usesr'; // these can't be random because otherwise they get reset each time we call cy.visit()
const password = 'the-password';
describe('Index Page', () => {
  const login = () => {
    cy.visit('http://localhost:8400/');
    cy.contains('Log In');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.contains('no local database found');
    cy.get('button').contains('Log in').click();

    cy.contains('Edit', { timeout: 30000 });
  };
  // app basic functions work
  it('should register user', () => {
    cy.visit('http://localhost:8400/');
    cy.contains('Sign up').click();
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Sign up').click();
    cy.contains('Edit', { timeout: 30000 });

    cy.contains('No notes found. Please create one');
  });
  it('should login, create, edit, delete notes', () => {
    login();
    // logged in and loaded
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
    login();

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
    cy.visit('http://localhost:8400/');

    cy.contains('Log In');
    cy.contains('Invalid username or password').should('not.exist');
    cy.contains('Password');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type('wrong password');
    cy.get('button').contains('Log in').click();
    cy.contains('Invalid username or password');
  });
  // interop stuff
  it('can create a flashcard linked to a note', () => {
    cy.visit('http://localhost:8500');

    cy.contains('Log In');
    cy.get('input[name=username]').clear().type(username);
    cy.get('input[type=password]').clear().type(password);
    cy.get('button').contains('Log in').click();
    cy.contains('Flashcards', { timeout: 30000 });
    cy.contains('No flashcards found. Please create one');
    cy.contains('What is the meaning of life?').should('not.exist');
    cy.contains('Hello Interoperability!').should('not.exist');

    login();

    cy.contains('New note').click();
    cy.contains('New Note Body');
    cy.get('textarea').clear().type('Hello Interoperability!');

    cy.contains('Link flashcard').click();
    cy.contains('New flashcard').click();
    cy.get('input[id=front-text]').type('What is the meaning of life?');
    cy.get('input[id=back-text]').clear().type('42');
    cy.contains('Create').click();

    cy.visit('http://localhost:8500');

    cy.contains('Flashcards', { timeout: 30000 }); // will log in automatically cause second time returning.

    // the flashcard we made in the other app should be here
    cy.contains('No flashcards found. Please create one', {
      timeout: 60000,
    }).should('not.exist');
    cy.contains('What is the meaning of life?');
    cy.contains('42').should('not.exist');
    cy.contains('Show Answer').click();
    cy.contains('42');

    cy.contains('Linked Notes:');
    cy.contains('Hello Interoperability!');
  });
});
