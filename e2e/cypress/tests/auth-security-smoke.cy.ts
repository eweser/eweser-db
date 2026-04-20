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

  it('submits the canonical forgot-password endpoint without leaking account state', () => {
    cy.intercept('POST', '**/forget-password').as('forgotPassword');
    cy.visit(`${authBase}/forgot-password`);
    cy.get('input[type="email"]').type('missing@example.com');
    cy.contains('button', 'Send reset link').click();
    cy.wait('@forgotPassword')
      .its('response.statusCode')
      .should('be.oneOf', [200, 400, 404]);
    cy.contains(
      'If an account exists, password reset instructions were sent.'
    ).should('be.visible');
  });
});
