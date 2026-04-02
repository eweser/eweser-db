declare namespace Cypress {
  interface Chainable {
    getBySel(
      value: string,
      ...args: unknown[]
    ): Chainable<JQuery<HTMLElement>>;
  }
}
