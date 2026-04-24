const authBase =
  (Cypress.env('AUTH_PAGES_BASE_URL') as string | undefined) ??
  (Cypress.env('authPagesBaseUrl') as string | undefined) ??
  (Cypress.config('baseUrl') as string | undefined) ??
  undefined;

(authBase ? describe : describe.skip)('auth security smoke', () => {
  it('renders sign-in with recovery/security links', () => {
    cy.visit(`${authBase}/sign-in`);
    cy.get('#sign-in-email').should('be.visible');
    cy.get('#sign-in-password').should('be.visible');
    cy.contains('a', 'Forgot your password?').should('be.visible');
    cy.contains('a', 'Create one').should('be.visible');
  });

  it('renders the sign-up page with all account creation fields', () => {
    cy.visit(`${authBase}/sign-up`);
    cy.get('#sign-up-name').should('be.visible');
    cy.get('#sign-up-email').should('be.visible');
    cy.get('#sign-up-password').should('be.visible');
    cy.contains('button', 'Create account').should('be.visible');
  });

  it('renders password recovery page', () => {
    cy.visit(`${authBase}/forgot-password`);
    cy.get('#forgot-password-email').should('be.visible');
    cy.contains('button', 'Send reset link').should('be.visible');
  });

  it('submits the canonical forgot-password endpoint without leaking account state', () => {
    cy.intercept('POST', '**/forget-password', (req) => {
      req.reply({
        statusCode: 200,
        body: { status: true },
      });
    }).as('forgotPassword');
    cy.visit(`${authBase}/forgot-password`);
    cy.get('#forgot-password-email').type('missing@example.com');
    cy.contains('button', 'Send reset link').click();
    cy.wait('@forgotPassword')
      .its('response.statusCode')
      .should('be.oneOf', [200, 400, 404]);
    cy.contains(
      'If an account exists, password reset instructions were sent.'
    ).should('be.visible');
  });
});
