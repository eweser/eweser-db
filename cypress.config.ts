import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'obyc2w',
  fixturesFolder: 'e2e/cypress/fixtures',
  screenshotsFolder: 'e2e/cypress/screenshots',
  videosFolder: 'e2e/cypress/videos',
  e2e: {
    supportFile: 'e2e/cypress/support/e2e.js',
    specPattern: 'e2e/cypress/**/*.cy.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:8000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
