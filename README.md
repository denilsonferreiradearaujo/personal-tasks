# 📌 Personal Tasks - Sistema Completo de Gestão de Tarefas & Equipes

> Plataforma Full-Stack moderna para gerenciamento ágil de tarefas em formato **Kanban**, com privacidade estrita, compartilhamento granular por link/e-mail, chat com uploads em tempo real, recuperação de senha via SMTP e controle de acessos baseado em cargos (**RBAC: Root, Admin e Usuário**).

---

## 🚀 Tecnologias Utilizadas

### **Frontend**
- **Next.js 14** (App Router, Server & Client Components, Standalone Build)
- **React 18** & **TypeScript**
- **Tailwind CSS** (Design moderno, responsivo e temas profissionais)
- **Lucide React** (Ícones vetoriais modernos)
- **Axios** (Comunicação HTTP com interceptors JWT)

### **Backend**
- **NestJS 10** (Arquitetura modular, TypeScript, Injeção de Dependências)
- **Prisma ORM** (Modelagem de dados e migrations com tipagem estrita)
- **MySQL 8** (Banco de dados relacional robusto)
- **Passport JWT & Bcrypt** (Autenticação segura e hash de senhas)
- **Nodemailer** (Disparo real de e-mails via Gmail SMTP com STARTTLS)
- **Multer** (Upload e armazenamento de anexos, imagens e prints)
- **Swagger / OpenAPI 3.0** (Documentação interativa de todos os endpoints)

---

## ✨ Funcionalidades Principais

- 📋 **Quadro Kanban Interativo**:
  - Colunas: *Não Iniciado*, *Em Desenvolvimento* e *Finalizado*.
  - Filtros avançados por texto, prioridade (*Baixa, Média, Alta*), equipe/squad e privacidade (*Minhas Tarefas vs Compartilhadas*).
  - Cards de métricas com contadores em tempo real.
- 🔒 **Privacidade Estrita de Tarefas**:
  - Cada usuário visualiza exclusivamente suas próprias tarefas e aquelas expressamente compartilhadas com ele.
  - Tarefas privadas permanecem 100% invisíveis para terceiros.
- 🔗 **Compartilhamento por Link e Auto-Autorização**:
  - Compartilhe tarefas gerando um link único com token criptografado.
  - Ao abrir o link, o usuário logado recebe autorização imediata e a tarefa passa a constar em seu quadro Kanban pessoal.
  - Badges visuais diferenciando tarefas:
    - 🔒 *Privada (sua)*
    - 🌐 *Compartilhada por você*
    - 👥 *Compartilhada com você (por [Nome])*
- 💬 **Feed / Chat da Tarefa em Tempo Real**:
  - Timeline interativa com suporte a comentários de texto, prints e anexos de arquivos.
  - Sincronização silenciosa (*Smart Polling com Page Visibility API*): as mensagens e alterações de status aparecem instantaneamente na tela de outros usuários sem necessidade de atualizar a página (F5).
- 👑 **Controle de Acessos (RBAC)**:
  - **ROOT**: Administrador supremo. Possui acesso total, aprova novos cadastros de usuários e pode promover colaboradores a administradores.
  - **ADMIN**: Gerencia tarefas, equipes e visualiza relatórios da organização.
  - **USER**: Cria suas próprias tarefas, interage nas tarefas compartilhadas e gerencia seu fluxo de trabalho.
- 📧 **Recuperação de Senha Segura**:
  - Envio de e-mail com link de redefinição e token seguro com validade de 1 hora via Gmail SMTP.

---

## 📂 Estrutura do Projeto

```text
personal-tasks/
├── back/                      # Backend em NestJS
│   ├── prisma/
│   │   ├── schema.prisma      # Modelagem do banco de dados
│   │   └── seed.ts            # Script de inicialização limpa (Criação do Root)
│   ├── src/
│   │   ├── auth/              # Autenticação JWT, Guardas, Reset de Senha & SMTP
│   │   ├── tasks/             # Módulo de Tarefas, Feed, Comentários & Uploads
│   │   ├── users/             # Módulo de Gestão de Usuários & RBAC
│   │   └── main.ts            # Ponto de entrada do NestJS e Swagger
│   ├── uploads/               # Diretório de armazenamento de anexos
│   └── Dockerfile             # Container do backend
│
├── front/                     # Frontend em Next.js 14
│   ├── src/
│   │   ├── app/               # Rotas e páginas (App Router)
│   │   ├── components/        # Componentes reutilizáveis (Kanban, Modais, Cards)
│   │   ├── context/           # AuthContext e gerenciamento de estado
│   │   └── services/          # Cliente HTTP Axios configurado
│   └── Dockerfile             # Container do frontend
│
├── docker-compose.yml         # Orquestração completa de Banco, Back e Front
└── README.md                  # Este documento
```

---

## 🛠️ Como Instalar e Rodar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) versão 18+ (recomendado Node 20 LTS)
- [Git](https://git-scm.com/)
- [MySQL](https://www.mysql.com/) 8+ (ou [Docker](https://www.docker.com/))

---

### Opção 1: Execução com Docker Compose (Recomendado)

A forma mais rápida de subir todo o ecossistema (MySQL, Backend e Frontend):

```bash
# 1. Clonar o repositório
git clone https://github.com/denilsonferreiradearaujo/personal-tasks.git
cd personal-tasks

# 2. Iniciar os containers em segundo plano
docker compose up -d --build
```

- **Frontend**: [http://localhost:3002](http://localhost:3002)
- **Backend API**: [http://localhost:3001](http://localhost:3001)
- **Documentação Swagger**: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

### Opção 2: Execução Manual (Localmente)

#### 1. Configurar e Iniciar o Backend

```bash
cd back

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```

Edite o arquivo `back/.env` com as configurações do seu banco e SMTP:
```env
PORT=3001
DATABASE_URL="mysql://root:1234@localhost:3306/simulado_saep"
JWT_SECRET="seu_jwt_secret_super_seguro"
JWT_EXPIRES_IN="7d"

# Configuração de E-mail (Gmail SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="seu-email@gmail.com"
SMTP_PASS="sua-senha-de-aplicativo-google"
SMTP_FROM="Personal Tasks <seu-email@gmail.com>"
APP_URL="http://localhost:3002"
```

Em seguida, execute as migrações e o seed inicial:
```bash
# Gerar o cliente Prisma e sincronizar tabelas com o banco
npx prisma db push

# Executar o seed para criar o usuário Root
npm run prisma:seed

# Iniciar o backend em modo desenvolvimento
npm run start:dev
```

#### 2. Configurar e Iniciar o Frontend

Em um novo terminal:
```bash
cd front

# Instalar dependências
npm install

# Iniciar o frontend em modo desenvolvimento
npm run dev
```

Abra seu navegador em [http://localhost:3002](http://localhost:3002).

---

## 🔑 Acesso Inicial (Configuração do Administrador Root)

Para configurar o seu próprio usuário **Root** com privilégios totais na aplicação:

1. Abra o arquivo [`back/prisma/seed.ts`](file:///back/prisma/seed.ts) e informe o seu **nome**, **e-mail** e **senha**:
   ```typescript
   // back/prisma/seed.ts
   const rootNome = 'Seu Nome Completo';
   const rootEmail = 'seu.email@exemplo.com';
   const rootSenha = 'sua_senha_inicial'; // Ex: 123456
   ```
   *(Ou se preferir, defina as variáveis `ROOT_NOME`, `ROOT_EMAIL` e `ROOT_PASSWORD` no seu arquivo `back/.env`)*.

2. Execute o comando de seed na pasta `back`:
   ```bash
   cd back
   npm run prisma:seed
   ```

3. Pronto! O banco de dados será inicializado com o seu usuário configurado com o cargo **`ROOT`** (permissão total para gerenciar o Kanban, aprovar novos usuários e promover outros administradores).

4. Acesse a tela de login em [http://localhost:3002/login](http://localhost:3002/login) com o seu e-mail e senha cadastrados.

> 💡 **Nota de Segurança**: Após o primeiro acesso, você pode alterar sua senha a qualquer momento através da funcionalidade de redefinição de senha com envio por e-mail.

---

## 📖 Documentação da API (Swagger)

Com o backend ativo, acesse a documentação interativa de todas as rotas em:
👉 **[http://localhost:3001/api/docs](http://localhost:3001/api/docs)**

Rotas em destaque:
- `POST /auth/login` - Autenticação JWT
- `POST /auth/register` - Cadastro de novos usuários
- `POST /auth/forgot-password` - Solicitação de redefinição de senha via SMTP
- `POST /auth/reset-password` - Redefinição com token seguro
- `GET /tasks` - Listagem de tarefas autorizadas com filtros e privacidade
- `POST /tasks` - Criação de tarefa vinculando o autor automaticamente
- `POST /tasks/:id/share` - Compartilhamento por token/e-mail
- `GET /tasks/shared/:shareToken` - Acesso e autorização via link compartilhado
- `GET /tasks/:id/comments` & `POST /tasks/:id/comments` - Feed de comentários e uploads

---

## 📜 Licença

Distribuído sob a licença MIT. Consulte `LICENSE` para mais informações.
