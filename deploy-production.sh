#!/bin/bash
# Script de deploy automático para produção
# Faz pull da imagem mais recente do Docker Hub e reinicia os containers

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploy Automático - Tech & Brew Dashboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Ir para o diretório do projeto
cd ~/domino-dashboard

# Atualizar código (se necessário)
echo "📥 Atualizando código do repositório..."
git pull origin main || echo "⚠️  Git pull falhou, continuando..."
echo ""

# Fazer pull das imagens mais recentes do Docker Hub
echo "🐳 Baixando imagens mais recentes do Docker Hub..."
docker pull pedropunx/domino-tech-backend:latest
docker pull pedropunx/domino-tech-frontend:latest
echo ""

# Parar containers antigos
echo "🛑 Parando containers antigos..."
docker-compose down
echo ""

# Iniciar novos containers
echo "🚀 Iniciando containers atualizados..."
docker-compose up -d
echo ""

# Aguardar inicialização
echo "⏳ Aguardando inicialização (30 segundos)..."
sleep 30
echo ""

# Verificar status
echo "✅ Status dos containers:"
docker-compose ps
echo ""

# Health check
echo "🏥 Verificando saúde do backend..."
curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || echo "⚠️  Backend ainda inicializando..."
echo ""

# Mostrar logs recentes
echo "📋 Logs recentes do backend:"
docker-compose logs --tail 30 backend
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Deploy concluído!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
