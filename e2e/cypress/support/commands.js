import '@testing-library/cypress/add-commands';

Cypress.Commands.add('getBySel', (value, ...args) => {
	return cy.get(`[data-cy="${value}"]`, ...args);
});

export {};
