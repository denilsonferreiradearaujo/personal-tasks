describe('Fluxo de Autenticação JWT e Cadastro', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('Deve exibir o formulário de login com todos os campos necessários', () => {
    cy.contains('Acesse sua conta').should('be.visible');
    cy.get('#login-email').should('be.visible');
    cy.get('#login-senha').should('be.visible');
    cy.get('#btn-login-submit').should('be.visible');
  });

  it('Deve exibir mensagem de erro ao tentar logar com credenciais inválidas', () => {
    cy.get('#login-email').type('email_inexistente@senai.com');
    cy.get('#login-senha').type('senha_errada');
    cy.get('#btn-login-submit').click();

    cy.contains('E-mail ou senha incorretos').should('be.visible');
  });

  it('Deve navegar para a tela de registro e permitir novo cadastro', () => {
    cy.contains('Cadastre-se gratuitamente').click();
    cy.url().should('include', '/register');
    cy.contains('Crie sua conta').should('be.visible');

    const randomId = Math.floor(Math.random() * 10000);
    cy.get('#register-nome').type(`Aluno Teste ${randomId}`);
    cy.get('#register-email').type(`aluno${randomId}@senai.com`);
    cy.get('#register-senha').type('123456');
    cy.get('#btn-register-submit').click();

    // Após registro com sucesso, é redirecionado para o Kanban
    cy.url().should('eq', `${Cypress.config().baseUrl}/`);
  });
});
