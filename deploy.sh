#!/bin/bash

# ==========================================================
# PERSONAL TASKS - DEPLOY AUTOMATIZADO VPS
# ==========================================================

set -Eeuo pipefail

# ==========================================================
# CONFIGURAÇÕES
# ==========================================================

PROJECT_DIR="/opt/personal-tasks"
BACKEND_DIR="$PROJECT_DIR/back"
FRONTEND_DIR="$PROJECT_DIR/front"

BACKEND_PM2="tasks-backend"
FRONTEND_PM2="tasks-frontend"

LOG_DIR="$PROJECT_DIR/deploy-logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="$LOG_DIR/deploy-$TIMESTAMP.log"

# ==========================================================
# CORES
# ==========================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ==========================================================
# PREPARAÇÃO
# ==========================================================

mkdir -p "$LOG_DIR"

# Envia saída para a tela e grava simultaneamente no arquivo de log
exec > >(tee -a "$LOG_FILE") 2>&1

# ==========================================================
# FUNÇÕES DE LOG
# ==========================================================

print_header() {
    echo ""
    echo "=========================================================="
    echo -e "${CYAN}$1${NC}"
    echo "=========================================================="
}

success() {
    echo -e "${GREEN}✓ $1${NC}"
}

error() {
    echo -e "${RED}✗ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

info() {
    echo -e "${BLUE}➜ $1${NC}"
}

# ==========================================================
# TRATAMENTO DE ERRO
# ==========================================================

handle_error() {
    local exit_code=$?

    echo ""
    error "DEPLOY FALHOU!"
    error "Código do erro: $exit_code"

    echo ""
    echo "Últimos logs do PM2:"
    echo "----------------------------------------------------------"

    pm2 logs "$BACKEND_PM2" --lines 30 --nostream 2>/dev/null || true
    pm2 logs "$FRONTEND_PM2" --lines 30 --nostream 2>/dev/null || true

    echo ""
    warning "Log completo salvo em:"
    echo "$LOG_FILE"

    exit "$exit_code"
}

trap handle_error ERR

# ==========================================================
# INÍCIO
# ==========================================================

clear 2>/dev/null || true

print_header "PERSONAL TASKS - DEPLOY AUTOMÁTICO"

echo "Data: $(date '+%d/%m/%Y %H:%M:%S')"
echo "Servidor: $(hostname)"
echo "Log: $LOG_FILE"

# ==========================================================
# 1. VERIFICAR DIRETÓRIO DO PROJETO
# ==========================================================

print_header "1. VERIFICANDO DIRETÓRIOS"

if [ ! -d "$PROJECT_DIR" ]; then
    error "Diretório não encontrado: $PROJECT_DIR"
    info "Certifique-se de clonar o projeto em /opt/personal-tasks antes de executar."
    exit 1
fi

cd "$PROJECT_DIR"
success "Projeto encontrado em $PROJECT_DIR"

# ==========================================================
# 2. ATUALIZANDO CÓDIGO (GIT PULL)
# ==========================================================

print_header "2. ATUALIZANDO CÓDIGO VIA GIT"

info "Branch atual:"
git branch --show-current

echo ""
info "Commit atualmente instalado:"
OLD_COMMIT=$(git rev-parse HEAD)
echo "$OLD_COMMIT"

echo ""
info "Versão atual:"
git log -1 --pretty=format:"%h - %s - %an - %ad" --date=format:'%d/%m/%Y %H:%M'

echo ""
echo ""
info "Executando git pull..."
git pull origin main

echo ""
NEW_COMMIT=$(git rev-parse HEAD)

info "Commit após atualização:"
echo "$NEW_COMMIT"

echo ""
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ]; then
    warning "Nenhuma alteração nova encontrada no repositório GitHub."
else
    success "Código atualizado com sucesso!"
    echo ""
    info "Alterações aplicadas:"
    git log --oneline "$OLD_COMMIT..$NEW_COMMIT"
fi

echo ""
info "Versão ativa instalada:"
git log -1 --pretty=format:"%h - %s - %an - %ad" --date=format:'%d/%m/%Y %H:%M'
echo ""

# ==========================================================
# 3. BACKEND (NESTJS + PRISMA)
# ==========================================================

print_header "3. ATUALIZANDO BACKEND"

cd "$BACKEND_DIR"
info "Diretório do backend: $BACKEND_DIR"

echo ""
info "Instalando/atualizando dependências do backend..."
npm install

echo ""
info "Gerando Prisma Client..."
npx prisma generate

echo ""
info "Sincronizando banco de dados com schema..."
npx prisma db push

echo ""
info "Compilando backend..."
npm run build
success "Build do backend concluído com sucesso."

echo ""
info "Reiniciando serviço no PM2: $BACKEND_PM2..."
# Reinicia se já existir, ou inicia pela primeira vez caso não exista
pm2 restart "$BACKEND_PM2" 2>/dev/null || pm2 start dist/src/main.js --name "$BACKEND_PM2"

sleep 3

# Validação do Backend
echo ""
info "Verificando saúde do backend..."
if pm2 describe "$BACKEND_PM2" | grep -q "online"; then
    success "Backend está ONLINE."
else
    error "Backend não está ONLINE."
    exit 1
fi

# ==========================================================
# 4. FRONTEND (NEXT.JS)
# ==========================================================

print_header "4. ATUALIZANDO FRONTEND"

cd "$FRONTEND_DIR"
info "Diretório do frontend: $FRONTEND_DIR"

echo ""
info "Instalando dependências do frontend..."
npm install

echo ""
info "Compilando frontend (Next.js build de produção)..."
npm run build
success "Build do frontend concluído com sucesso."

echo ""
info "Reiniciando serviço no PM2: $FRONTEND_PM2..."
# Reinicia se já existir, ou inicia pela primeira vez caso não exista
pm2 restart "$FRONTEND_PM2" 2>/dev/null || pm2 start npm --name "$FRONTEND_PM2" -- start

sleep 3

# Validação do Frontend
echo ""
info "Verificando saúde do frontend..."
if pm2 describe "$FRONTEND_PM2" | grep -q "online"; then
    success "Frontend está ONLINE."
else
    error "Frontend não está ONLINE."
    exit 1
fi

# ==========================================================
# 5. SALVAR STATUS DO PM2
# ==========================================================

print_header "5. STATUS DOS SERVIÇOS NO PM2"

pm2 status

echo ""
info "Salvando lista de processos do PM2 para auto-inicialização no boot da VPS..."
pm2 save
success "Configuração do PM2 salva com sucesso."

# ==========================================================
# RESUMO FINAL
# ==========================================================

print_header "DEPLOY CONCLUÍDO COM SUCESSO!"

echo -e "${GREEN}✓ Código Git atualizado${NC}"
echo -e "${GREEN}✓ Banco de dados e Prisma sincronizados${NC}"
echo -e "${GREEN}✓ Backend compilado e ONLINE${NC}"
echo -e "${GREEN}✓ Frontend compilado e ONLINE${NC}"
echo -e "${GREEN}✓ Configuração do PM2 persistida${NC}"

echo ""
echo "Commit instalado:"
git -C "$PROJECT_DIR" log -1 --pretty=format:"%h - %s"

echo ""
echo ""
echo "Log completo registrado em:"
echo "$LOG_FILE"

echo ""
echo "=========================================================="
echo -e "${GREEN} SISTEMA ATUALIZADO E DISPONÍVEL!${NC}"
echo "=========================================================="
