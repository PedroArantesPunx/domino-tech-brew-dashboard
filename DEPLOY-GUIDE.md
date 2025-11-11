# Guia de Deploy Automatizado

## Fluxo de Deploy

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Git Push     │ ───▶ │ GitHub       │ ───▶ │ Docker Hub   │ ───▶ │ Servidor     │
│ (main)       │      │ Actions      │      │ (público)    │      │ (privado)    │
└──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
```

## Processo Automático

### 1. Você faz alterações no código

```bash
# Edita arquivos backend/frontend
git add .
git commit -m "feat: Nova funcionalidade"
git push origin main
```

### 2. GitHub Actions detecta automaticamente

- **Frontend**: Deploy automático para Vercel (instantâneo)
- **Backend**: Build e push para Docker Hub (~40-50 segundos)

### 3. Atualizar no servidor

**Opção A: Script automático (recomendado)**
```bash
# No servidor de produção
cd ~/domino-dashboard
./deploy-production.sh
```

**Opção B: Manual**
```bash
cd ~/domino-dashboard
docker-compose pull
docker-compose down
docker-compose up -d
```

## Verificar Status do Build

```bash
# Ver últimos workflows
gh run list --limit 5

# Ver detalhes de um workflow
gh run view <RUN_ID>

# Ver logs de um workflow
gh run view <RUN_ID> --log
```

## Troubleshooting

### Build falhou no GitHub Actions

```bash
# Ver logs do último run
gh run list --limit 1 --workflow "ci-backend.yml"
gh run view --log
```

### Container não inicia no servidor

```bash
# Ver logs do container
docker-compose logs backend --tail 50

# Verificar variáveis de ambiente
cat backend/.env

# Verificar se a imagem foi baixada
docker images | grep domino-tech-backend

# Verificar rede
docker network ls | grep dashboard
```

### API retorna 502

```bash
# Verificar se container está rodando
docker-compose ps

# Verificar health check
curl http://localhost:3001/api/health

# Ver logs em tempo real
docker-compose logs -f backend
```

## Variáveis de Ambiente Necessárias

### Servidor de Produção (`backend/.env`)
```bash
SLACK_BOT_TOKEN=xoxb-...
CHANNEL_ID=C09LD4K2GAH
PORT=3001
NODE_ENV=production
ADMIN_PASSWORD_HASH=$2a$10$...
FINGERPRINT_API_KEY=jYjQeGQ6IPaXsDoIfv0I
```

### GitHub Secrets
```
DOCKERHUB_USERNAME=pedropunx
DOCKERHUB_TOKEN=dckr_pat_...
VERCEL_TOKEN=...
VERCEL_ORG_ID=...
VERCEL_PROJECT_ID=...
```

## Imagens Docker

- **Backend**: `pedropunx/domino-tech-backend:latest`
- **Frontend**: `pedropunx/domino-tech-frontend:latest`

## Arquitetura de Deploy

### Frontend
- **Desenvolvimento**: `npm start` (localhost:3000)
- **Produção**: Vercel (https://techandbrew.com.br)
- **CI/CD**: `.github/workflows/deploy-frontend-vercel.yml`

### Backend
- **Desenvolvimento**: `npm run dev` (localhost:3001)
- **Produção**: Docker + Cloudflare Tunnel
  - Container: `dashboard-backend`
  - Rede interna: 192.168.1.13:3001
  - Acesso público: https://api-domino.techandbrew.com.br
- **CI/CD**: `.github/workflows/ci-backend.yml`

## Cloudflare Tunnel

O backend está acessível publicamente através de:
```
https://api-domino.techandbrew.com.br
  ↓
Cloudflare Tunnel (ed1d71e1-28a8-4769-b8d4-f5417fcda960)
  ↓
Servidor privado (192.168.1.13:3001)
```

## Rollback Rápido

Se algo der errado, fazer rollback para versão anterior:

```bash
# No servidor
cd ~/domino-dashboard

# Ver commits recentes
git log --oneline -10

# Voltar para commit anterior
git reset --hard <COMMIT_HASH>

# Rebuild e restart
docker-compose build backend
docker-compose up -d backend
```

Ou usar imagem anterior do Docker Hub:
```bash
# Usar tag específica (commit hash)
docker pull pedropunx/domino-tech-backend:<COMMIT_SHA>

# Editar docker-compose.yml para usar a tag específica
# Depois:
docker-compose up -d backend
```
