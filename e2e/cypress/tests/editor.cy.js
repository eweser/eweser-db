/// <reference types="Cypress" />
/// <reference types="@testing-library/cypress" />
import { deleteDB } from 'idb';

async function clearAllDatabases() {
  const databases = await window.indexedDB.databases();
  for (const database of databases) {
    if (database.name) await deleteDB(database.name);
  }
}

describe('Index Page', { baseUrl: 'http://localhost:8091' }, () => {
  beforeEach(async () => {
    await clearAllDatabases();
  });

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
    cy.get('input[type=password]')
      .should('not.be.disabled')
      .clear()
      .type(password);
    cy.get('button').contains('Log in').click();

    // logged in and loaded
    cy.contains('Edit', { timeout: 30000 });

    cy.contains('Notes');

    cy.contains('No notes found. Please create one');
    cy.contains('New note').click();
    cy.contains('No notes found. Please create one').should('not.exist');
    cy.contains('My markdown note');
    cy.wait(1000);
    cy.get('div[role=textbox]').should('have.length', 2);
    cy.get('div[role=textbox]').first().clear().type('Hello World');
    cy.findAllByText('Hello World').should('have.length', 2);

    cy.contains('X').click();
    cy.contains('No notes found. Please create one');

    cy.contains('New note').click();
    cy.contains('My markdown note');
    cy.wait(1000);
    cy.get('div[role=textbox]').should('have.length', 2);
    cy.get('div[role=textbox]').first().clear().type('Hello 2');
    cy.findAllByText('Hello 2').should('have.length', 2);
    cy.contains('New note').click();
    cy.wait(1000);
    cy.get('div[role=textbox]').should('have.length', 3);
    cy.get('div[role=textbox]').first().clear().type('Hello 3');
    cy.findAllByText('Hello 2').should('have.length', 1); //just the preview
    cy.findAllByText('Hello 3').should('have.length', 2); // preview and editor
    cy.contains('X').click();
    cy.contains('X').click();
    cy.wait(1000);
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
    cy.contains('X').click();

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
});
