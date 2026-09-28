import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando limpeza e inicialização limpa do banco de dados...');

  // Limpar todos os dados existentes
  await prisma.tarefaComentario.deleteMany();
  await prisma.tarefaCompartilhada.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.tarefa.deleteMany();
  await prisma.user.deleteMany();

  // Configuração do Usuário Root (altere aqui com seu nome, e-mail e senha desejados)
  const rootNome = process.env.ROOT_NOME || 'Administrador Root';
  const rootEmail = process.env.ROOT_EMAIL || 'admin@exemplo.com';
  const rootSenha = process.env.ROOT_PASSWORD || '123456';

  // Gerar hash para a senha inicial do Root
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(rootSenha, salt);

  // Criar Usuário Root único
  const rootUser = await prisma.user.create({
    data: {
      nome: rootNome,
      email: rootEmail,
      senha: senhaHash,
      role: 'ROOT',
      ativo: true,
    },
  });

  console.log(`✅ Banco de dados zerado com sucesso!`);
  console.log(`👑 Usuário Root criado: ${rootUser.nome} (${rootUser.email}) - Role: ${rootUser.role}`);
  console.log(`📋 Total de tarefas: 0 (Sistema 100% limpo)`);
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
