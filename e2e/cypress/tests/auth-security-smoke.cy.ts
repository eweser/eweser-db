const authBase = Cypress.env('AUTH_PAGES_BASE_URL') as string | undefined;

(authBase ? describe : describe.skip)('auth security smoke', () => {
  it('renders sign-in with recovery/security links', () => {
    cy.visit(`${authBase}/sign-in`);
    cy.contains('Forgot your password?').should('be.visible');
    cy.contains('Create one').should('be.visible');
  });

  it('renders password recovery page', () => {
    cy.visit(`${authBase}/forgot-password`);
    cy.contains('Reset your password').should('be.visible');
    cy.contains('Send reset link').should('be.visible');
  });
});
