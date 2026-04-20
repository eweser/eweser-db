import { defineConfig } from 'cypress';

const exampleBasicPort = process.env.EXAMPLE_BASIC_PORT ?? '38110';
const eweNotePort = process.env.EWE_NOTE_PORT ?? '5173';
const baseUrl =
  process.env.CYPRESS_BASE_URL ?? `http://localhost:${exampleBasicPort}`;
const eweNoteBaseUrl =
  process.env.EWE_NOTE_BASE_URL ?? `http://localhost:${eweNotePort}/notes/`;
const authServer = process.env.VITE_AUTH_SERVER ?? `http://localhost:38101`;
const authPagesBaseUrl =
  process.env.AUTH_PAGES_BASE_URL ?? 'http://localhost:38111/auth';

export default defineConfig({
  projectId: 'obyc2w',
  fixturesFolder: 'e2e/cypress/fixtures',
  screenshotsFolder: 'e2e/cypress/screenshots',
  videosFolder: 'e2e/cypress/videos',
  e2e: {
    supportFile: 'e2e/cypress/support/e2e.js',
    specPattern: 'e2e/cypress/**/*.cy.{js,jsx,ts,tsx}',
    baseUrl,
    env: {
      authPagesBaseUrl,
      AUTH_PAGES_BASE_URL: authPagesBaseUrl,
      eweNoteBaseUrl,
      authServer,
    },
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
