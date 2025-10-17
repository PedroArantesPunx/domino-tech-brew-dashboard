# 🐳 Dashboard Slack - Docker Setup

Este projeto está containerizado com Docker para facilitar o deployment em qualquer máquina.

## 📋 Pré-requisitos

- ✅ Docker instalado
- ✅ Docker Compose (ou Docker Desktop)
- ✅ Token do Slack configurado

## 🐳 Imagens Docker Hub

Imagens pré-buildadas disponíveis:
- **Backend**: `pedropunx/domino-tech-backend:latest`
- **Frontend**: `pedropunx/domino-tech-frontend:latest`

## 🚀 Quick Start

### 1. Configurar Variáveis de Ambiente

```bash
# Copie o arquivo de exemplo
cp backend/.env.example backend/.env

# Edite com seus dados reais
nano backend/.env
```

**Configure:**
```env
SLACK_BOT_TOKEN=xoxb-SEU-TOKEN-AQUI
CHANNEL_ID=C09LD4K2GAH
PORT=3001
NODE_ENV=production
```

### 2. Iniciar com Docker Compose

```bash
# Usar imagens pré-buildadas do Docker Hub
docker-compose up -d

# Ou se quiser buildar localmente
docker-compose up --build
```

### 3. Acessar Aplicação

- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **Health Check**: http://localhost/api/health

## 🛠️ Comandos Úteis

### Build Manual

```bash
# Backend
docker build -t dashboard-backend ./backend

# Frontend
docker build -t dashboard-frontend .
```

### Executar Containers Individuais

```bash
# Network
docker network create dashboard-network

# Backend
docker run -d \
  --name dashboard-backend \
  --network dashboard-network \
  --env-file backend/.env \
  -p 3001:3001 \
  dashboard-backend

# Frontend
docker run -d \
  --name dashboard-frontend \
  --network dashboard-network \
  -p 80:80 \
  dashboard-frontend
```

### Logs e Debug

```bash
# Ver logs
docker-compose logs -f

# Logs específicos
docker-compose logs backend
docker-compose logs frontend

# Entrar no container
docker-compose exec backend sh
docker-compose exec frontend sh
```

### Limpeza

```bash
# Parar containers
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Limpar imagens não utilizadas
docker system prune -a
```

## 📁 Estrutura do Projeto

```
📦 domino-tech-brew-dashboard/
├── 🐳 docker-compose.yml          # Orquestração dos containers
├── 🐳 Dockerfile                  # Build do frontend
├── 📄 nginx.conf                  # Configuração do Nginx
├── 📄 .dockerignore              # Arquivos ignorados pelo Docker
├── 📂 backend/
│   ├── 🐳 Dockerfile             # Build do backend
│   ├── 📄 .dockerignore          # Arquivos ignorados
│   ├── 📄 .env.example           # Exemplo de variáveis
│   ├── 📄 .env                   # Variáveis reais (não versionado)
│   ├── 📄 server.js              # Código do servidor
│   └── 📄 package.json           # Dependências
├── 📂 src/                       # Código React
└── 📂 public/                    # Arquivos estáticos
```

## 🔧 Configurações Avançadas

### SSL/HTTPS

Para produção com HTTPS:

1. **Gere certificados SSL**
2. **Crie pasta ssl/** com certificados
3. **Atualize nginx.conf** para HTTPS

### Variáveis de Ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `SLACK_BOT_TOKEN` | Token do bot Slack | `xoxb-...` |
| `CHANNEL_ID` | ID do canal Slack | `C09LD4K2GAH` |
| `PORT` | Porta do backend | `3001` |
| `NODE_ENV` | Ambiente | `production` |

### Persistência de Dados

Os dados são salvos em volume Docker:
```bash
# Backup
docker cp dashboard-backend:/app/alertas.json ./backup.json

# Restore
docker cp ./backup.json dashboard-backend:/app/alertas.json
```

## 🚀 Deploy em Produção

### Opção 1: Docker Hub

```bash
# Build e tag
docker build -t seu-usuario/dashboard-backend ./backend
docker build -t seu-usuario/dashboard-frontend .

# Push
docker push seu-usuario/dashboard-backend
docker push seu-usuario/dashboard-frontend
```

### Opção 2: GitHub Actions

O projeto inclui workflow de CI/CD automático.

### Opção 3: VPS/Cloud

```bash
# No servidor
git clone https://github.com/PedroArantesPunx/domino-tech-brew-dashboard.git
cd domino-tech-brew-dashboard
cp backend/.env.example backend/.env
# Editar .env com dados reais
docker-compose up -d --build
```

## 🐛 Troubleshooting

### Container não inicia

```bash
# Verificar logs
docker-compose logs

# Verificar se portas estão livres
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :3001
```

### Erro de permissão Docker

```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
# Fazer logout/login
```

### Frontend não conecta no backend

Verifique se:
- ✅ Backend está rodando na porta 3001
- ✅ Network `dashboard-network` existe
- ✅ Nginx proxy está configurado corretamente

## 📞 Suporte

- **Issues**: https://github.com/PedroArantesPunx/domino-tech-brew-dashboard/issues
- **Docs**: Veja os READMEs específicos de cada módulo

---

🎉 **Pronto!** Seu dashboard está dockerizado e pronto para qualquer ambiente!