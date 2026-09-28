/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    login(email?: string, senha?: string): Chainable<void>;
  }
}

Cypress.Commands.add('login', (email = 'gabriel@senai.com', senha = '123456') => {
  cy.visit('/login');
  cy.get('#login-email').clear().type(email);
  cy.get('#login-senha').clear().type(senha);
  cy.get('#btn-login-submit').click();
  cy.url().should('eq', `${Cypress.config().baseUrl}/`);
});
