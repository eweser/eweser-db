import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'obyc2w',
  fixturesFolder: 'e2e/cypress/fixtures',
  screenshotsFolder: 'e2e/cypress/screenshots',
  videosFolder: 'e2e/cypress/videos',
  e2e: {
    specPattern: 'e2e/cypress/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
    baseUrl: 'http://localhost:8081',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
