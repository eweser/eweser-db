/// <reference types="cypress" />

const eweNoteUrl = () => Cypress.env('eweNoteBaseUrl') ?? '';

describe('ewe-note app', () => {
  beforeEach(() => {
    cy.visit(eweNoteUrl(), {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
  });

  it('loads the app and shows the editor', () => {
    // The app should resolve quickly from the loading spinner to the editor
    cy.getBySel('ewe-note-loading').should('not.exist');
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('shows the sidebar with login link when not authenticated', () => {
    cy.getBySel('ewe-note-sidebar').should('exist');
    cy.getBySel('ewe-note-login').should('exist');
    cy.getBySel('ewe-note-logout').should('not.exist');
  });

  it('shows the header with breadcrumb after load', () => {
    cy.getBySel('ewe-note-header').should('exist');
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('can create a new note via the sidebar new-note button', () => {
    // Wait for app to fully load
    cy.getBySel('ewe-note-editor').should('exist');

    // Get current count of note items
    cy.get('[data-cy^="ewe-note-note-item-"]').then(($items) => {
      const initialCount = $items.length;

      // Click new note button
      cy.getBySel('ewe-note-new-note').click();

      // There should now be one more note item
      cy.get('[data-cy^="ewe-note-note-item-"]').should(
        'have.length',
        initialCount + 1
      );
    });
  });

  it('can switch between notes by clicking in the sidebar', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    // Create a second note so we have two to click between
    cy.getBySel('ewe-note-new-note').click();

    cy.get('[data-cy^="ewe-note-note-item-"]').should(
      'have.length.at.least',
      2
    );

    // Click the first note
    cy.get('[data-cy^="ewe-note-note-item-"]').first().click();
    cy.getBySel('ewe-note-editor').should('exist');

    // Click the second note
    cy.get('[data-cy^="ewe-note-note-item-"]').last().click();
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('can open the new-folder dialog and cancel', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.getBySel('ewe-note-new-folder-input').should('be.visible');

    // Cancel via the Cancel button
    cy.contains('button', 'Cancel').click();
    cy.getBySel('ewe-note-new-folder-input').should('not.exist');
  });

  it('can open the new-folder dialog, fill a name, and create a folder', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    const folderName = `Test Folder ${Date.now()}`;
    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.getBySel('ewe-note-new-folder-input').type(folderName);
    cy.getBySel('ewe-note-create-folder-submit').click();

    // After creation, the new folder's collapsible should appear with the folder name
    cy.contains(folderName).should('exist');
  });

  it('persists notes across page reload via localStorage', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    // Create an extra note
    cy.getBySel('ewe-note-new-note').click();

    cy.get('[data-cy^="ewe-note-note-item-"]').then(($items) => {
      const countBefore = $items.length;

      // Reload without clearing localStorage
      cy.reload();

      cy.getBySel('ewe-note-editor').should('exist');
      cy.get('[data-cy^="ewe-note-note-item-"]').should(
        'have.length',
        countBefore
      );
    });
  });

  it('login link points to auth server', () => {
    const authServer = Cypress.env('authServer') as string;
    cy.getBySel('ewe-note-login')
      .should('have.attr', 'href')
      .and('include', authServer);
  });

  it('typing in the editor saves the note text and updates the sidebar title', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    // Create a fresh note
    cy.getBySel('ewe-note-new-note').click();

    // Type in the editor — BlockNote uses ProseMirror under the hood
    const noteTitle = `My test note ${Date.now()}`;
    cy.get('.bn-editor').click();
    // Select all and replace with our heading
    cy.get('.bn-editor').type('{selectAll}', { force: true });
    cy.get('.bn-editor').type(`# ${noteTitle}`, { force: true });

    // Wait for debounce (1s) + buffer
    cy.wait(1500);

    // Sidebar should show updated title (markdown stripped by removeMarkdown)
    cy.get('[data-cy^="ewe-note-note-item-"] span').should(
      'contain',
      noteTitle
    );

    // Header breadcrumb should also show updated title
    cy.getBySel('ewe-note-header').should('contain', noteTitle);
  });

  it('saves note text so it persists after switching notes and back', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    // Create first note and type in it
    cy.getBySel('ewe-note-new-note').click();
    const noteTitle = `Persist test ${Date.now()}`;
    cy.get('.bn-editor').click();
    cy.get('.bn-editor').type('{selectAll}', { force: true });
    cy.get('.bn-editor').type(`# ${noteTitle}`, { force: true });
    cy.wait(1500);

    // Create a second note to switch away
    cy.getBySel('ewe-note-new-note').click();
    cy.getBySel('ewe-note-editor').should('exist');

    // Switch back to the note that has matching sidebar text
    cy.contains('[data-cy^="ewe-note-note-item-"]', noteTitle).click();

    // The editor should load the saved text
    cy.get('.bn-editor').should('contain', noteTitle);
  });

  it('saves note text so it persists after a page reload', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    // Create a note and type content
    cy.getBySel('ewe-note-new-note').click();
    const noteTitle = `Reload persist ${Date.now()}`;
    cy.get('.bn-editor').click();
    cy.get('.bn-editor').type('{selectAll}', { force: true });
    cy.get('.bn-editor').type(`# ${noteTitle}`, { force: true });
    cy.wait(1500);

    // Reload without clearing localStorage/IndexedDB
    cy.reload();
    cy.getBySel('ewe-note-editor').should('exist');

    // Find the note in the sidebar and click it
    cy.contains('[data-cy^="ewe-note-note-item-"]', noteTitle).click();

    // The editor should have the saved text
    cy.get('.bn-editor').should('contain', noteTitle);
  });
});
