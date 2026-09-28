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

  // Gerar hash para a senha inicial do Root (123456)
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash('123456', salt);

  // Criar Usuário Root único
  const rootUser = await prisma.user.create({
    data: {
      nome: 'DENILSON FERREIRA DE ARAUJO',
      email: 'denilson.ferreiradearaujo@gmail.com',
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
