/// <reference types="cypress" />

const eweNoteUrl = () =>
  (Cypress.env('eweNoteBaseUrl') as string | undefined) ??
  (Cypress.config('baseUrl') as string | undefined) ??
  '';

function visitHome() {
  cy.visit(eweNoteUrl(), {
    onBeforeLoad(win) {
      win.localStorage.clear();
    },
  });

  cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
  cy.getBySel('ewe-note-new-note').should('exist');
}

function createNote(markdown: string) {
  cy.getBySel('ewe-note-new-note').click();
  cy.url({ timeout: 10000 }).should('include', '/editor/');
  cy.getBySel('ewe-note-header', { timeout: 10000 }).should('exist');
  cy.getBySel('ewe-note-editor', { timeout: 10000 }).should('exist');
  cy.getBySel('ewe-note-tiptap-editor').click();
  cy.getBySel('ewe-note-tiptap-editor').type('{selectAll}', { force: true });
  cy.getBySel('ewe-note-tiptap-editor').type(markdown, { force: true });
  cy.wait(1500);
}

describe('ewe-note app', () => {
  it('loads the home dashboard with sidebar actions', () => {
    visitHome();

    cy.contains('All Notes').should('exist');
    cy.getBySel('ewe-note-account-link').should('exist');
    cy.getBySel('ewe-note-settings-link').should('exist');
  });

  it('creates a new note and opens the editor', () => {
    visitHome();

    createNote('# Fresh note{enter}Body copy');

    cy.getBySel('ewe-note-tiptap-editor').should('contain', 'Fresh note');
  });

  it('persists note content after a reload on the editor route', () => {
    const title = `Reload persist ${Date.now()}`;
    visitHome();

    createNote(`# ${title}{enter}Saved body`);

    cy.reload();
    cy.getBySel('ewe-note-editor', { timeout: 10000 }).should('exist');
    cy.getBySel('ewe-note-tiptap-editor')
      .should('contain', title)
      .and('contain', 'Saved body');
  });

  it('creates a folder from the visible sidebar dialog', () => {
    const folderName = `Test Folder ${Date.now()}`;
    visitHome();

    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.getBySel('ewe-note-folder-name-input').type(folderName);
    cy.getBySel('ewe-note-folder-submit').click();
    cy.contains(folderName).should('exist');
  });

  it('enters focus mode from the editor', () => {
    visitHome();

    createNote('# Focus mode note');

    cy.getBySel('ewe-note-focus-mode').click();
    cy.getBySel('ewe-note-focus-mode-active', { timeout: 10000 }).should(
      'exist'
    );
    cy.contains('Exit Focus Mode').should('exist');
    cy.getBySel('ewe-note-sidebar').should('not.exist');
  });

  it('deletes a note from the editor menu and returns home', () => {
    visitHome();

    createNote('# Delete me');

    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });

    cy.getBySel('ewe-note-editor-menu-trigger').click();
    cy.getBySel('ewe-note-delete-note').click();

    cy.url({ timeout: 10000 }).should('not.include', '/editor/');
    cy.contains('All Notes').should('exist');
  });

  it('shows markdown tasks in the tasks view', () => {
    const taskText = `Review task ${Date.now()}`;
    visitHome();

    createNote(`# Task note{enter}- [ ] ${taskText}`);

    cy.visit(eweNoteUrl());
    cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
    cy.getBySel('ewe-note-tasks-link', { timeout: 10000 }).click();
    cy.contains(taskText).should('exist');
  });

  it('opens the settings page from the sidebar', () => {
    visitHome();

    cy.getBySel('ewe-note-settings-link').click();
    cy.url().should('include', '/settings');
    cy.getBySel('ewe-note-settings-page', { timeout: 10000 }).should('exist');
    cy.getBySel('ewe-note-settings-homeserver').should('exist');
  });

  it('opens account settings from the profile row', () => {
    visitHome();

    cy.getBySel('ewe-note-account-link').click();
    cy.url().should('include', '/settings#account');
    cy.getBySel('ewe-note-settings-account', { timeout: 10000 }).should(
      'exist'
    );
  });

  it('supports source mode and Obsidian raw markdown fallback', () => {
    visitHome();

    createNote('# Source mode note');

    cy.get('button[aria-label="Source mode"]').should('be.visible').click();
    cy.getBySel('ewe-note-source-editor')
      .should('exist')
      .clear()
      .type(
        '# Raw OFM{enter}{enter}> [!warning]+ Keep me{enter}> Callout body{enter}{enter}![[image.png|320]]{enter}{enter}%%comment%%{enter}{enter}[^1]: footnote',
        {
          force: true,
          parseSpecialCharSequences: false,
        }
      );
    cy.contains('button', 'Live preview').click();
    cy.getBySel('ewe-note-tiptap-editor').should('contain', 'Raw OFM');
  });
});
