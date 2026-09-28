describe('Quadro Kanban e Gestão de Tarefas', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('Deve renderizar o cabeçalho, métricas e as 3 colunas do Kanban', () => {
    cy.contains('Quadro de Tarefas (Kanban)').should('be.visible');
    cy.contains('Total de Tarefas').should('be.visible');
    cy.contains('Não Iniciado').should('be.visible');
    cy.contains('Em Desenvolvimento').should('be.visible');
    cy.contains('Finalizado').should('be.visible');
  });

  it('Deve abrir o modal de nova tarefa ao clicar no botão da Navbar', () => {
    cy.contains('Nova Tarefa').click();
    cy.contains('Preencha as informações para registrar uma nova tarefa no Kanban.').should('be.visible');
    cy.get('textarea[placeholder*="Desenvolver fluxo"]').should('be.visible');
  });
});
