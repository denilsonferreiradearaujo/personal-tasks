describe('Gerenciamento de Usuários', () => {
  beforeEach(() => {
    cy.visit('/usuarios');
  });

  it('Deve exibir a listagem de usuários cadastrados', () => {
    cy.contains('Gerenciamento de Usuários').should('be.visible');
    cy.contains('Cadastrar Usuário').should('be.visible');
  });

  it('Deve abrir o modal de cadastro de novo usuário', () => {
    cy.contains('Cadastrar Usuário').first().click();
    cy.contains('Cadastrar Novo Usuário').should('be.visible');
    cy.get('input[placeholder="Ex: Carlos Eduardo"]').should('be.visible');
  });
});
