#!/bin/bash
# Deploy manual do backend para servidor doméstico

set -e

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
BACKEND_HOST="192.168.1.13"
BACKEND_USER="pedro"
BACKEND_DIR="domino-dashboard"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🚀 Deploy Backend - Servidor Doméstico  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Verificar conectividade
echo -e "${YELLOW}📡 Verificando conectividade com ${BACKEND_HOST}...${NC}"
if ! ping -c 1 -W 2 ${BACKEND_HOST} &> /dev/null; then
    echo -e "${RED}❌ Servidor ${BACKEND_HOST} não está acessível!${NC}"
    echo -e "${YELLOW}   Verifique se:${NC}"
    echo -e "${YELLOW}   - O notebook está ligado${NC}"
    echo -e "${YELLOW}   - Está na mesma rede${NC}"
    echo -e "${YELLOW}   - IP está correto${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Servidor acessível${NC}"
echo ""

# Fazer deploy via SSH
echo -e "${BLUE}🔄 Iniciando deploy...${NC}"
echo ""

ssh -o StrictHostKeyChecking=no ${BACKEND_USER}@${BACKEND_HOST} << 'ENDSSH'
cd domino-dashboard

echo "📥 Atualizando código do repositório..."
git pull origin main

echo ""
echo "🛑 Parando container existente..."
docker stop dashboard-backend 2>/dev/null || echo "Container já estava parado"
docker rm dashboard-backend 2>/dev/null || echo "Container já foi removido"

echo ""
echo "🔨 Reconstruindo imagem do backend..."
docker build -t pedropunx/domino-tech-backend:latest ./backend

echo ""
echo "🚀 Iniciando novo container..."
docker compose up -d backend

echo ""
echo "⏳ Aguardando container iniciar (15 segundos)..."
sleep 15

echo ""
echo "📊 Status do container:"
docker compose ps

echo ""
echo "🏥 Health check:"
curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/api/health

echo ""
echo "📋 Últimas 15 linhas do log:"
docker compose logs --tail 15 backend
ENDSSH

SSH_EXIT=$?

echo ""
if [ $SSH_EXIT -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║    ✅ Deploy concluído com sucesso!       ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📍 Backend rodando em: http://${BACKEND_HOST}:3001${NC}"
    echo -e "${BLUE}🏥 Health check: http://${BACKEND_HOST}:3001/api/health${NC}"
else
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║     ❌ Deploy falhou! (Exit: $SSH_EXIT)        ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    exit $SSH_EXIT
fi
