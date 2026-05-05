/// <reference types="cypress" />

const eweNoteUrl = () =>
  (Cypress.env('eweNoteBaseUrl') as string | undefined) ??
  (Cypress.config('baseUrl') as string | undefined) ??
  '';

const featureVaultFixturePath = (relativePath: string) =>
  `packages/ewe-note/test-fixtures/obsidian-feature-vault/${relativePath}`;

function visitHome() {
  cy.visit(eweNoteUrl(), {
    onBeforeLoad(win) {
      win.localStorage.clear();
    },
  });

  cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
  cy.getBySel('ewe-note-new-note').should('exist');
}

function stubClipboard(
  behavior: 'resolve' | 'reject' = 'resolve',
  alias = 'clipboardWrite'
) {
  cy.window().then((win) => {
    const writeText = cy.stub().as(alias);
    if (behavior === 'resolve') {
      writeText.resolves();
    } else {
      writeText.rejects(new Error('Clipboard denied'));
    }

    Object.defineProperty(win.navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });
}

function createNote(markdown: string) {
  cy.getBySel('ewe-note-new-note').first().click();
  cy.url({ timeout: 10000 }).should('include', '/editor/');
  cy.getBySel('ewe-note-header', { timeout: 10000 }).should('exist');
  cy.getBySel('ewe-note-editor', { timeout: 10000 }).should('exist');
  cy.getBySel('ewe-note-tiptap-editor').click();
  cy.getBySel('ewe-note-tiptap-editor').type('{selectAll}', { force: true });
  cy.getBySel('ewe-note-tiptap-editor').type(markdown, { force: true });
  cy.wait(1500);
}

function switchToSourceMode() {
  cy.getBySel('ewe-note-editor-menu-trigger').click();
  cy.contains('[role="menuitem"]', 'Edit raw Markdown')
    .should('be.visible')
    .click();
  cy.getBySel('ewe-note-source-editor').should('exist');
}

function createNoteInSourceMode(markdown: string) {
  cy.getBySel('ewe-note-new-note').first().click();
  cy.url({ timeout: 10000 }).should('include', '/editor/');
  cy.getBySel('ewe-note-header', { timeout: 10000 }).should('exist');
  switchToSourceMode();
  cy.getBySel('ewe-note-source-editor').clear().type(markdown, {
    force: true,
    parseSpecialCharSequences: false,
  });
  cy.wait(1500);
}

describe('ewe-note app', () => {
  it('loads the home dashboard with sidebar actions', () => {
    visitHome();

    cy.contains('Library').should('not.exist');
    cy.contains('All Notes').should('not.exist');
    cy.contains('Write').should('not.exist');
    cy.contains('Browse').should('not.exist');
    cy.contains('Organize').should('not.exist');
    cy.contains('Inspect').should('not.exist');
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

  it('moves an open note to a folder from visible note actions', () => {
    const folderName = `Move Target ${Date.now()}`;
    const noteTitle = `Move me ${Date.now()}`;
    visitHome();

    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.getBySel('ewe-note-folder-name-input').type(folderName);
    cy.getBySel('ewe-note-folder-submit').click();

    createNote(`# ${noteTitle}{enter}Folder move body`);

    cy.getBySel('ewe-note-editor-menu-trigger').click();
    cy.contains('[data-slot="dropdown-menu-label"]', 'Move to folder').should(
      'be.visible'
    );
    cy.contains('[data-slot="dropdown-menu-item"]', folderName).click();

    cy.getBySel('ewe-note-header').should('be.visible');
    cy.getBySel('ewe-note-header').should('not.contain', folderName);
  });

  it('shares a local folder link only after clipboard success and opens that folder link', () => {
    const folderName = `Share Target ${Date.now()}`;
    visitHome();
    stubClipboard('resolve');

    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.getBySel('ewe-note-folder-name-input').type(folderName);
    cy.getBySel('ewe-note-folder-submit').click();

    cy.get(`button[aria-label="Folder actions for ${folderName}"]`).click();
    cy.contains('[role="menuitem"]', 'Share folder').click();
    cy.getBySel('ewe-note-share-dialog').should('be.visible');
    cy.contains('Access grants not included').should('be.visible');
    cy.getBySel('ewe-note-share-copy-btn').click();
    cy.get('@clipboardWrite').should('have.been.calledOnce');
    cy.getBySel('ewe-note-share-copy-btn').should('contain', 'Copied');

    cy.getBySel('ewe-note-share-link-input')
      .invoke('val')
      .then((value) => {
        cy.visit(String(value));
      });
    cy.contains(folderName, { timeout: 10000 }).should('be.visible');
  });

  it('does not show folder share success when clipboard access fails', () => {
    const folderName = `Share Fail ${Date.now()}`;
    visitHome();
    stubClipboard('reject');

    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.getBySel('ewe-note-folder-name-input').type(folderName);
    cy.getBySel('ewe-note-folder-submit').click();

    cy.get(`button[aria-label="Folder actions for ${folderName}"]`).click();
    cy.contains('[role="menuitem"]', 'Share folder').click();
    cy.getBySel('ewe-note-share-copy-btn').click();
    cy.getBySel('ewe-note-share-copy-btn').should('contain', 'Copy failed');
    cy.getBySel('ewe-note-share-copy-error').should('be.visible');
  });

  it('reports note link clipboard failures instead of optimistic success', () => {
    visitHome();
    stubClipboard('reject');

    createNote('# Clipboard failure note');

    cy.getBySel('ewe-note-editor-menu-trigger').click();
    cy.getBySel('ewe-note-copy-link').click();
    cy.get('@clipboardWrite').should('have.been.calledOnce');
    cy.getBySel('ewe-note-copy-link').should('contain', 'Copy failed');
  });

  it('enters focus mode from the editor', () => {
    visitHome();

    createNote('# Focus mode note');

    cy.getBySel('ewe-note-focus-mode').click();
    cy.getBySel('ewe-note-focus-mode-active', { timeout: 10000 }).should(
      'exist'
    );
    cy.get('button[aria-label="Exit focus mode"]').should('exist');
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
    cy.getBySel('ewe-note-sidebar').should('exist');
    cy.contains('All Notes').should('not.exist');
  });

  it('shows markdown tasks in the tasks view', () => {
    visitHome();

    cy.readFile(featureVaultFixturePath('01 Markdown Syntax.md')).then(
      (markdown: string) => {
        createNoteInSourceMode(markdown);
      }
    );

    cy.visit(eweNoteUrl());
    cy.getBySel('ewe-note-sidebar', { timeout: 10000 }).should('exist');
    cy.getBySel('ewe-note-tasks-link', { timeout: 10000 }).click();
    cy.contains('Follow up on [[05 Link Targets]]').should('exist');
    cy.contains('Confirm [[07 Embeds and Media]] references').should(
      'not.exist'
    );
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

  it('supports source mode with feature-vault raw markdown fallback', () => {
    visitHome();

    cy.readFile(featureVaultFixturePath('11 Source Mode Edge Cases.md')).then(
      (markdown: string) => {
        createNoteInSourceMode(markdown);
      }
    );

    cy.contains('button', 'Text').should('not.exist');
    cy.contains('button', 'Insert').should('not.exist');
    cy.contains('button', 'Lists').should('not.exist');
    cy.getBySel('ewe-note-source-editor')
      .should('contain.value', '<details open>')
      .and('contain.value', '%%Comment bodies should survive.%%')
      .and('contain.value', '\\> [!note] This should stay plain text here.');
    cy.get('button[aria-label="Return to rich editor"]').click();
    cy.getBySel('ewe-note-tiptap-editor')
      .should('contain', 'Source Mode Edge Cases')
      .and('contain', 'Expandable HTML block');
  });
});
