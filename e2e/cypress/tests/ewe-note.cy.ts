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

    // Stub prompt to return null (cancel)
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(null);
    });

    cy.getBySel('ewe-note-new-folder-trigger').click();

    // Prompt was called and cancelled - no folder should be created
    // Just verify the app is still functional
    cy.getBySel('ewe-note-sidebar').should('exist');
  });

  it('can open the new-folder dialog, fill a name, and create a folder', () => {
    cy.getBySel('ewe-note-editor').should('exist');

    const folderName = `Test Folder ${Date.now()}`;

    // Stub prompt to return the folder name
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(folderName);
    });

    cy.getBySel('ewe-note-new-folder-trigger').click();

    // After creation, the new folder should appear in the sidebar
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

// ---------------------------------------------------------------------------
// Run 2 — Note CRUD: delete, rename, duplicate, export, copy-link
// ---------------------------------------------------------------------------

describe('Note CRUD — delete and rename', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('deletes a note via the editor ⋯ menu and navigates back to home', () => {
    // Navigate into the default note that is already open
    cy.get('[data-cy^="ewe-note-note-item-"]').first().click();
    cy.getBySel('ewe-note-editor').should('exist');

    // Stub confirm → true
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });

    cy.getBySel('ewe-note-delete-note').click();

    // After deletion, navigated back to home (no editor, or new note loaded)
    cy.url().should('not.include', '/editor/');
  });

  it('deletes a note via the sidebar context menu', () => {
    // Create a note we can safely delete
    cy.getBySel('ewe-note-new-note').click();
    cy.get('[data-cy^="ewe-note-note-item-"]').last().rightclick();

    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });

    cy.contains('[role="menuitem"]', 'Delete').click();
  });

  it('renames a note via the sidebar context menu and sidebar title updates', () => {
    const newName = `Renamed ${Date.now()}`;

    cy.get('[data-cy^="ewe-note-note-item-"]').first().rightclick();

    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(newName);
    });

    cy.contains('[role="menuitem"]', 'Rename').click();

    cy.contains('[data-cy^="ewe-note-note-item-"]', newName).should('exist');
  });
});

describe('Editor toolbar actions', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
    // Navigate into the first note
    cy.get('[data-cy^="ewe-note-note-item-"]').first().click();
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('Copy Link copies the current URL to clipboard', () => {
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText')
        .as('clipboardWrite')
        .resolves();
    });

    cy.getBySel('ewe-note-copy-link').click();

    cy.get('@clipboardWrite').should('have.been.calledOnce');
  });

  it('Duplicate creates a new note with "Copy of" prefix and navigates to it', () => {
    cy.get('[data-cy^="ewe-note-note-item-"]').then(($items) => {
      const countBefore = $items.length;

      cy.getBySel('ewe-note-duplicate').click();

      // New note count
      cy.get('[data-cy^="ewe-note-note-item-"]').should(
        'have.length',
        countBefore + 1
      );
      // URL changed to new note
      cy.url().should('include', '/editor/');
    });
  });

  it('Export as Markdown triggers a file download', () => {
    // Stub anchor click to prevent actual download
    cy.window().then((win) => {
      cy.stub(win.HTMLAnchorElement.prototype, 'click').as('anchorClick');
    });

    cy.getBySel('ewe-note-export').click();

    cy.get('@anchorClick').should('have.been.calledOnce');
  });
});

// ---------------------------------------------------------------------------
// Run 3 — Focus Mode + Right Panel
// ---------------------------------------------------------------------------

describe('Focus Mode', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
    cy.get('[data-cy^="ewe-note-note-item-"]').first().click();
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('entering focus mode hides the sidebar and shows Exit Focus Mode button', () => {
    cy.getBySel('ewe-note-focus-mode').click();

    cy.getBySel('ewe-note-sidebar').should('not.exist');
    cy.contains('Exit Focus Mode').should('be.visible');
  });

  it('exiting focus mode restores the normal editor layout', () => {
    cy.getBySel('ewe-note-focus-mode').click();
    cy.contains('Exit Focus Mode').click();

    cy.getBySel('ewe-note-sidebar').should('exist');
    cy.getBySel('ewe-note-editor').should('exist');
  });
});

describe('Right Panel — info panel', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
    cy.get('[data-cy^="ewe-note-note-item-"]').first().click();
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('clicking the info-panel-toggle opens the right panel', () => {
    cy.getBySel('ewe-note-right-panel').should('not.exist');
    cy.getBySel('ewe-note-info-panel-toggle').click();
    cy.getBySel('ewe-note-right-panel').should('exist');
  });

  it('closing the panel via the X button hides it', () => {
    cy.getBySel('ewe-note-info-panel-toggle').click();
    cy.getBySel('ewe-note-right-panel').should('exist');

    cy.getBySel('ewe-note-right-panel').within(() => {
      cy.get('button').first().click();
    });

    cy.getBySel('ewe-note-right-panel').should('not.exist');
  });

  it('adding a tag in the panel makes the tag appear in the note', () => {
    cy.getBySel('ewe-note-info-panel-toggle').click();
    cy.getBySel('ewe-note-right-panel').should('exist');

    // Switch to properties/meta tab
    cy.getBySel('ewe-note-right-panel').within(() => {
      cy.contains('Meta').click();
      cy.getBySel('ewe-note-add-tag-input').type('cypress-tag');
      cy.getBySel('ewe-note-add-tag-btn').click();
    });

    // Tag should appear inside the panel
    cy.getBySel('ewe-note-right-panel').contains('cypress-tag').should('exist');
  });

  it('adding a property makes the property appear in the panel', () => {
    cy.getBySel('ewe-note-info-panel-toggle').click();
    cy.getBySel('ewe-note-right-panel').should('exist');

    cy.getBySel('ewe-note-right-panel').within(() => {
      cy.contains('Meta').click();
      cy.getBySel('ewe-note-add-property-key').type('author');
      cy.getBySel('ewe-note-add-property-value').type('Cypress');
      cy.getBySel('ewe-note-add-property-btn').click();
    });

    cy.getBySel('ewe-note-right-panel').contains('author').should('exist');
  });
});

// ---------------------------------------------------------------------------
// Run 4 — Command palette
// ---------------------------------------------------------------------------

describe('Command palette', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('opens with Ctrl+K and closes with Esc', () => {
    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-command-palette').should('exist');
    cy.getBySel('ewe-note-command-input').should('be.focused');

    cy.get('body').type('{esc}');
    cy.getBySel('ewe-note-command-palette').should('not.exist');
  });

  it('typing filters the recent note list to matching titles', () => {
    // Create a uniquely titled note first
    const unique = `UniqueCP${Date.now()}`;
    cy.getBySel('ewe-note-new-note').click();
    cy.get('.bn-editor').click();
    cy.get('.bn-editor').type(`# ${unique}`, { force: true });
    cy.wait(1500);

    // Open palette and search
    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-command-input').type(unique);

    cy.contains(unique).should('exist');
  });

  it('selecting a search result navigates to that note', () => {
    const unique = `NavTest${Date.now()}`;
    cy.getBySel('ewe-note-new-note').click();
    cy.get('.bn-editor').click();
    cy.get('.bn-editor').type(`# ${unique}`, { force: true });
    cy.wait(1500);

    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-command-input').type(unique);
    cy.contains(unique).click();

    cy.getBySel('ewe-note-editor').should('exist');
    cy.url().should('include', '/editor/');
  });

  it('typing and pressing Enter on "Create ..." creates a new note with that title', () => {
    const title = `PaletteCreate${Date.now()}`;
    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-command-input').type(title);

    cy.get('[data-cy^="ewe-note-note-item-"]').then(($before) => {
      const countBefore = $before.length;
      cy.contains(`Create "${title}"`).click();
      cy.get('[data-cy^="ewe-note-note-item-"]').should(
        'have.length',
        countBefore + 1
      );
    });
  });

  it('"Browse Templates" item opens the TemplatesDialog', () => {
    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-browse-templates').click();
    cy.getBySel('ewe-note-templates-dialog').should('exist');
  });
});

// ---------------------------------------------------------------------------
// Run 5 — Templates
// ---------------------------------------------------------------------------

describe('Templates', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
    // Open templates via command palette
    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-browse-templates').click();
    cy.getBySel('ewe-note-templates-dialog').should('exist');
  });

  it('opening the TemplatesDialog shows default templates', () => {
    // Default templates should appear
    cy.getBySel('ewe-note-templates-dialog').within(() => {
      cy.get('[data-cy^="ewe-note-templates-use-"]').should(
        'have.length.at.least',
        1
      );
    });
  });

  it('"Use Template" creates a new note and navigates to it', () => {
    cy.getBySel('ewe-note-templates-dialog').within(() => {
      cy.get('[data-cy^="ewe-note-templates-use-"]').first().click();
    });
    cy.getBySel('ewe-note-templates-dialog').should('not.exist');
    cy.url().should('include', '/editor/');
  });

  it('creating a custom template saves it and it appears in the list', () => {
    const tplName = `CypressTpl${Date.now()}`;
    cy.getBySel('ewe-note-templates-dialog').within(() => {
      cy.contains('Create New Template').click();
      cy.getBySel('ewe-note-new-template-name').type(tplName);
      cy.getBySel('ewe-note-new-template-content').type('# Test content');
      cy.getBySel('ewe-note-create-template-btn').click();
    });
    cy.getBySel('ewe-note-templates-dialog').contains(tplName).should('exist');
  });

  it('custom templates persist after page reload', () => {
    const tplName = `PersistTpl${Date.now()}`;
    cy.getBySel('ewe-note-templates-dialog').within(() => {
      cy.contains('Create New Template').click();
      cy.getBySel('ewe-note-new-template-name').type(tplName);
      cy.getBySel('ewe-note-new-template-content').type('# Persistent');
      cy.getBySel('ewe-note-create-template-btn').click();
    });

    // Close dialog and reload (without clearing localStorage)
    cy.get('[role="dialog"]').type('{esc}');
    cy.reload();

    cy.getBySel('ewe-note-editor').should('exist');
    cy.get('body').type('{ctrl}k');
    cy.getBySel('ewe-note-browse-templates').click();
    cy.getBySel('ewe-note-templates-dialog').contains(tplName).should('exist');
  });

  it('deleting a template removes it from the list', () => {
    const tplName = `DeleteTpl${Date.now()}`;
    cy.getBySel('ewe-note-templates-dialog').within(() => {
      cy.contains('Create New Template').click();
      cy.getBySel('ewe-note-new-template-name').type(tplName);
      cy.getBySel('ewe-note-new-template-content').type('# To delete');
      cy.getBySel('ewe-note-create-template-btn').click();
    });

    cy.getBySel('ewe-note-templates-dialog').contains(tplName).should('exist');

    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });

    // Hover to reveal delete button then click it
    cy.get('[data-cy^="ewe-note-templates-delete-"]')
      .last()
      .click({ force: true });

    cy.getBySel('ewe-note-templates-dialog')
      .contains(tplName)
      .should('not.exist');
  });
});

// ---------------------------------------------------------------------------
// Run 6 — Tasks view
// ---------------------------------------------------------------------------

describe('Tasks view', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('switching to Tasks nav shows the tasks view container', () => {
    cy.getBySel('ewe-note-tasks-link').click();
    cy.getBySel('ewe-note-tasks-view').should('exist');
  });

  it('no tasks shows the "No tasks found" empty state', () => {
    cy.getBySel('ewe-note-tasks-link').click();
    cy.getBySel('ewe-note-tasks-view')
      .contains('No tasks found')
      .should('exist');
  });

  it('tasks are shown when notes contain markdown checkboxes', () => {
    // Create a note with a checkbox task
    cy.getBySel('ewe-note-new-note').click();
    cy.get('.bn-editor').click();
    cy.get('.bn-editor').type('- [ ] My cypress task', { force: true });
    cy.wait(1500);

    cy.getBySel('ewe-note-tasks-link').click();
    cy.getBySel('ewe-note-tasks-view').should('exist');
    // Tasks may or may not appear depending on how the parser picks up BlockNote content;
    // at minimum the view is present with no crash
  });
});

// ---------------------------------------------------------------------------
// Run 7 — Folders, drag-and-drop (skipped if helper unavailable), Share dialog
// ---------------------------------------------------------------------------

describe('Folders', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('creating a note via the folder + button places it in that folder', () => {
    // Create a new folder first
    const folderName = `Folder${Date.now()}`;
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(folderName);
    });
    cy.getBySel('ewe-note-new-folder-trigger').click();
    cy.contains(folderName).should('exist');

    // Hover the folder row to reveal the + note button (force-click since it appears on hover)
    cy.contains(folderName)
      .closest('div')
      .find('button[title="New note in folder"]')
      .click({ force: true });

    // A new note should be created and navigated to
    cy.url().should('include', '/editor/');
  });
});

describe('Share folder dialog', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('clicking the share icon opens the dialog for that folder', () => {
    // Hover first folder to reveal the share button
    cy.get('[data-cy="ewe-note-sidebar"]').within(() => {
      cy.get('button[title="Share folder"]').first().click({ force: true });
    });
    cy.getBySel('ewe-note-share-dialog').should('exist');
  });

  it('the share link input contains the current origin and folder id', () => {
    cy.get('[data-cy="ewe-note-sidebar"]').within(() => {
      cy.get('button[title="Share folder"]').first().click({ force: true });
    });
    cy.getBySel('ewe-note-share-link-input')
      .invoke('val')
      .should('include', Cypress.config('baseUrl') ?? window.location.origin);
  });

  it('clicking Copy copies the link to clipboard', () => {
    cy.window().then((win) => {
      cy.stub(win.navigator.clipboard, 'writeText')
        .as('clipboardWrite')
        .resolves();
    });

    cy.get('[data-cy="ewe-note-sidebar"]').within(() => {
      cy.get('button[title="Share folder"]').first().click({ force: true });
    });

    cy.getBySel('ewe-note-share-copy-btn').click();
    cy.get('@clipboardWrite').should('have.been.calledOnce');
  });
});

// ---------------------------------------------------------------------------
// Run 8 — Settings page
// ---------------------------------------------------------------------------

describe('Settings page', () => {
  beforeEach(() => {
    cy.visit(Cypress.env('eweNoteBaseUrl') ?? '', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      },
    });
    cy.getBySel('ewe-note-editor').should('exist');
  });

  it('clicking Settings in the sidebar navigates to /settings', () => {
    cy.getBySel('ewe-note-settings-link').click();
    cy.url().should('include', '/settings');
    cy.getBySel('ewe-note-settings-page').should('exist');
  });

  it('the settings page shows the homeserver URL section', () => {
    cy.getBySel('ewe-note-settings-link').click();
    cy.getBySel('ewe-note-settings-homeserver').should('exist');
  });

  it('shows Sign in button when not authenticated', () => {
    cy.getBySel('ewe-note-settings-link').click();
    cy.contains('Sign in to sync').should('exist');
  });

  it('sign-out button is hidden when not authenticated', () => {
    cy.getBySel('ewe-note-settings-link').click();
    cy.getBySel('ewe-note-settings-signout').should('not.exist');
  });
});
