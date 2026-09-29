# 🚀 Guia Completo de Deploy na VPS Integrator (ICP Panel)
## Projeto: Personal Tasks

Guia passo a passo, detalhado e descomplicado para subir a aplicação **Personal Tasks** na sua VPS da Integrator usando o painel **ICP (Integrator Container Panel)**.

---

## ❓ PM2 ou Docker? Qual a melhor escolha para a sua VPS?

> ### 🏆 **Recomendação Definitiva: Use o PM2!**

Para o seu cenário na VPS Integrator (`vps6663`), onde você já possui `sep-panel` e `sep2-panel` rodando em `/opt`:

1. **Economia Brutal de Memória RAM e CPU**:
   - Cada container Docker sobe uma camada completa de sistema operacional, runtime e daemon de background.
   - O **PM2** roda as aplicações diretamente sobre o Node.js que você já tem instalado. Cada serviço consome entre **60MB a 120MB de RAM**.
   - Em uma VPS compartilhada/containerizada, o PM2 evita que seu servidor trave por falta de memória (*Out of Memory*).
2. **Integração Perfeita com o ICP Panel**:
   - O seu painel ICP gerencia **Proxy Reverso** (Nginx) nativamente. Ele escuta a porta local (`127.0.0.1:PORT`) e aplica certificados **SSL/HTTPS automáticos** e gratuitos (Let's Encrypt).
3. **Padronização com seus outros projetos**:
   - O seu projeto `sep-panel` já foi configurado com PM2. Manter o mesmo padrão torna a manutenção simples: com um único comando (`pm2 status`), você visualiza a saúde de todos os seus sistemas no mesmo lugar.
4. **Sem complexidade de volumes de arquivos**:
   - Uploads de fotos, avatares e configurações de identidade visual ficam direto no disco da VPS, sem precisar gerenciar bind mounts complexos do Docker.

*(Deixamos uma seção opcional de Docker no final deste guia para referência futura, mas recomendamos seguir 100% com o PM2).*

---

## 📋 Informações do Projeto e Mapeamento de Portas

> ⚠️ **ATENÇÃO ÀS PORTAS:** Como o `sep-panel` já utiliza as portas `3000` (frontend) e `3001` (backend), definimos as portas **`3003`** e **`3004`** para o **Personal Tasks** não conflitar.

| Item | Valor / Configuração |
|---|---|
| **Diretório na VPS** | `/opt/personal-tasks` |
| **Backend** | NestJS 10/11 + Prisma ORM (MySQL) |
| **Porta Backend (Interna)** | `3003` |
| **Frontend** | Next.js 14 (React 18) |
| **Porta Frontend (Interna)** | `3004` |
| **Repositório Git** | `https://github.com/denilsonferreiradearaujo/personal-tasks.git` |
| **Painel ICP** | `https://vps6663.panel.icontainer.run:2090` |
| **Sugestão Subdomínio Frontend** | `https://personaltasks.vps6663.panel.icontainer.run` |
| **Sugestão Subdomínio Backend (API)**| `https://personaltasks-api.vps6663.panel.icontainer.run` |

---

## 🛠️ Passo a Passo Completo do Deploy

---

### 📝 Passo 1 — Criar o Banco de Dados MySQL no Painel ICP

O Personal Tasks utiliza MySQL para gerenciar usuários, tarefas e configurações.

1. Acesse seu painel: **`https://vps6663.panel.icontainer.run:2090`**
2. No menu lateral, acesse **Databases** (ou Banco de Dados) ➜ **Create Database**.
3. Crie uma nova base:
   - **Database Name:** `personal_tasks`
   - **User:** `tasks_user` (ou utilize o seu usuário root/padrão do MySQL)
   - **Password:** Defina uma senha forte (exemplo: `Tasks@2026!Sec`)
4. Anote essas credenciais, você as usará no arquivo `.env` do backend.

---

### 📝 Passo 2 — Acessar o Terminal da VPS e Clonar o Projeto

1. No painel ICP, vá no menu **Server ➜ Terminal** (ou acesse via SSH).
2. Navegue até a pasta `/opt`:
```bash
cd /opt
```
3. Clone o repositório oficial do projeto:
```bash
git clone https://github.com/denilsonferreiradearaujo/personal-tasks.git personal-tasks
```
4. Entre na pasta criada:
```bash
cd /opt/personal-tasks
ls -la
```
*(Você verá as pastas `back`, `front`, etc.)*

---

### 📝 Passo 3 — Configurar e Compilar o Backend (NestJS)

1. Entre na pasta do backend:
```bash
cd /opt/personal-tasks/back
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env` de produção:
```bash
cat > .env << 'EOF'
PORT=3003
DATABASE_URL="mysql://personal_tasks:Denilson2021!@@localhost:3306/personal_tasks"
JWT_SECRET="c1f4e9a3b8d2e7f60123456789abcdef0123456789abcdef0123456789abcdef"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="https://personaltasks.vps6663.panel.icontainer.run"

# Configuração SMTP para e-mails (redefinição de senha)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=denilson.ferreiradearaujo@gmail.com
SMTP_PASS=226ACDB8BBC5-4730-A478-07B001DB14E4
SMTP_FROM="Personal Tasks <denilson.ferreiradearaujo@gmail.com>"
EOF
```
> 💡 *Ajuste a linha `DATABASE_URL` com o usuário, senha e nome do banco que você criou no Passo 1.*

4. Sincronize o banco de dados com o Prisma (criação automática de tabelas):
```bash
# Gerar o Prisma Client
npx prisma generate

# Sincronizar o schema com o MySQL
npx prisma db push
```

5. Inicializar o Usuário Root (opcional caso queira rodar o seed limpo):
```bash
npm run prisma:seed
```

6. Compilar o Backend para Produção:
```bash
npm run build
```

7. Testar rapidamente se o backend sobe sem erros:
```bash
node dist/src/main.js
```
*(Quando vir a mensagem `🚀 Backend NestJS rodando com sucesso na porta: 3003`, pressione `Ctrl + C` para parar o teste).*

---

### 📝 Passo 4 — Configurar e Compilar o Frontend (Next.js)

1. Entre na pasta do frontend:
```bash
cd /opt/personal-tasks/front
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env.local` informando a URL pública da API:
```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_URL=https://personaltasks-api.vps6663.panel.icontainer.run
EOF
```

4. Compile o frontend para produção:
```bash
npm run build
```
*(Aguarde até aparecer a mensagem de build concluído com sucesso).*

---

### 📝 Passo 5 — Subir as Aplicações com o PM2

O PM2 manterá as duas aplicações rodando 24 horas por dia em segundo plano e as reiniciará automaticamente em caso de falha ou reinício da VPS.

1. Se ainda não tiver o PM2 instalado globalmente na VPS, instale:
```bash
npm install -g pm2
```

2. **Iniciar o Backend no PM2 (porta 3003)**:
```bash
cd /opt/personal-tasks/back
pm2 start npm --name "tasks-backend" -- run start:prod
```

3. **Iniciar o Frontend no PM2 (porta 3004)**:
```bash
cd /opt/personal-tasks/front
pm2 start npm --name "tasks-frontend" -- start -- -p 3004
```

4. Conferir se ambos estão online:
```bash
pm2 status
```
*Você verá `tasks-backend` e `tasks-frontend` com status **online**.*

5. Salvar a lista de processos para persistir mesmo se a VPS for reiniciada:
```bash
pm2 save
pm2 startup
```
*(Se o `pm2 startup` exibir uma linha de comando para copiar e colar, copie e execute-a no terminal).*

---

### 📝 Passo 6 — Criar os Sites no Painel ICP (Proxy Reverso + SSL)

Agora vamos conectar a internet aos seus processos locais usando o Nginx do ICP:

#### 6.1 — Criar o Site para o Frontend
1. No painel ICP, vá em **Web ➜ Create Site** (Criar Site).
2. Preencha os campos:
   - **Domain / Subdomain:** `personaltasks.vps6663.panel.icontainer.run` (ou o domínio que preferir)
   - **Type:** `Reverse Proxy` (Proxy Reverso)
   - **Target / Destination:** `http://127.0.0.1:3004`
   - **Enable SSL / HTTPS:** Marque ✅ **Sim** (Let's Encrypt)
3. Clique em **Save**.

#### 6.2 — Criar o Site para o Backend (API)
1. Vá novamente em **Web ➜ Create Site**.
2. Preencha os campos:
   - **Domain / Subdomain:** `personaltasks-api.vps6663.panel.icontainer.run` (ou o domínio que preferir)
   - **Type:** `Reverse Proxy` (Proxy Reverso)
   - **Target / Destination:** `http://127.0.0.1:3003`
   - **Enable SSL / HTTPS:** Marque ✅ **Sim** (Let's Encrypt)
3. Clique em **Save**.

> 🎉 **Pronto!** Sua aplicação estará no ar com HTTPS seguro e acessível mundialmente!

---

## 🔄 Como Atualizar o Projeto na VPS após novos Commits

Sempre que fizer novos commits no seu computador e der `git push`, atualize a VPS com este roteiro rápido:

```bash
# 1. Acessar a pasta do projeto
cd /opt/personal-tasks

# 2. Puxar o código atualizado do GitHub
git pull origin main

# 3. Atualizar e recompilar o Backend
cd /opt/personal-tasks/back
npm install
npx prisma generate
npx prisma db push
npm run build
pm2 restart tasks-backend

# 4. Atualizar e recompilar o Frontend
cd /opt/personal-tasks/front
npm install
npm run build
pm2 restart tasks-frontend

# 5. Verificar status
pm2 status
```

---

## 🧰 Comandos Úteis do PM2 no dia a dia

```bash
# Visualizar status de todos os sistemas (SEP + Personal Tasks)
pm2 status

# Ver logs em tempo real do Backend
pm2 logs tasks-backend

# Ver logs em tempo real do Frontend
pm2 logs tasks-frontend

# Ver os últimos 100 logs de erro
pm2 logs tasks-backend --err --lines 100

# Reiniciar individualmente
pm2 restart tasks-backend
pm2 restart tasks-frontend

# Parar um serviço
pm2 stop tasks-backend
```

---

## 🔧 Resolução de Problemas Frequentes (Troubleshooting)

| Sintoma | Causa Mais Provável | Solução |
|---|---|---|
| **Erro `EADDRINUSE` na porta** | Outro processo está ocupando a 3003 ou 3004 | Verifique com `lsof -i :3003` ou `netstat -tlpn` e finalize com `kill -9 PID`. |
| **Build do Next.js travou / erro de memória** | Memória RAM insuficiente durante o build | Rode com limite de memória: `NODE_OPTIONS=--max-old-space-size=2048 npm run build`. |
| **Erro de conexão com o banco de dados** | Senha ou usuário errado no `.env` do backend | Abra o `back/.env` com `nano .env` e confira a linha `DATABASE_URL`. Teste a conexão MySQL com `mysql -u tasks_user -p`. |
| **WhatsApp Evolution API não envia** | URL da Evolution API incorreta nas Configurações | No painel web vá em **Configurações ➜ WhatsApp** e informe a URL correta (ex: `https://evolutionapi.vps6663.panel.icontainer.run/message/sendText/personal-tasks`). |
| **Imagens/Logo não carregam** | Pasta uploads sem permissão | Execute `chmod -R 755 /opt/personal-tasks/back/uploads`. |

---

## 🐳 Bônus Opcional: E se eu quiser usar Docker no futuro?

Se futuramente você optar por conteinerizar tudo com Docker Compose, a estrutura padrão seria criar um arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./back
      dockerfile: Dockerfile
    container_name: personal-tasks-backend
    restart: always
    ports:
      - "3003:3003"
    environment:
      - PORT=3003
      - DATABASE_URL=mysql://tasks_user:senha@host.docker.internal:3306/personal_tasks
      - FRONTEND_URL=https://tasks.vps6663.panel.icontainer.run
    volumes:
      - ./back/uploads:/app/uploads

  frontend:
    build:
      context: ./front
      dockerfile: Dockerfile
    container_name: personal-tasks-frontend
    restart: always
    ports:
      - "3004:3004"
    environment:
      - NEXT_PUBLIC_API_URL=https://tasks-api.vps6663.panel.icontainer.run
    depends_on:
      - backend
```

> **Por que não recomendamos agora?**  
> Porque no Docker você precisará manter Dockerfiles com multi-stage build, gerenciar volumes extras para uploads e prisma engines, e gastará entre 500MB a 1.5GB a mais de memória RAM na sua VPS, que já abriga o `sep-panel` e `sep2-panel`. Com **PM2**, você tem máxima performance, mínimo consumo e controle total em poucos segundos!
