# 📊 Dashboard Slack - Domino Tech & Brew

Dashboard em tempo real para monitoramento de relatórios financeiros do Slack, exibindo métricas de GGR, NGR, Turnover, Depósitos, Saques e muito mais.

## 🚀 Demo

**URL de Produção**: https://techandbrew.com.br

![Dashboard Screenshot](https://via.placeholder.com/800x400/3b82f6/ffffff?text=Dashboard+Tech+%26+Brew)

## ✨ Funcionalidades

- 📈 **Relatórios em Tempo Real**: Dados atualizados do Slack a cada hora
- 💰 **Métricas Financeiras**: GGR, NGR, Turnover, Depósitos e Saques
- 🎰 **Análise por Produto**: Cassino e Sportsbook separados
- 👥 **Métricas de Usuários**: Jogadores únicos, apostadores e depositantes
- 📊 **Histórico Completo**: Tabela com todos os relatórios processados
- 🔄 **Auto-refresh**: Atualização automática opcional (30s)
- 🐳 **Containerizado**: Deploy simplificado com Docker

## 🛠️ Tecnologias

### Frontend
- React 18
- Recharts (gráficos)
- Lucide React (ícones)
- Nginx (servidor web)

### Backend
- Node.js 18
- Express
- Slack Web API (@slack/web-api)
- CORS

### DevOps
- Docker & Docker Compose
- Docker Hub (imagens pré-buildadas)
- Nginx (reverse proxy)

## 📋 Pré-requisitos

- Docker instalado
- Token de Bot do Slack com permissões:
  - `channels:history`
  - `channels:read`
  - `groups:history`
  - `groups:read`

## 🚀 Quick Start

### 1. Clone o Repositório

```bash
git clone https://github.com/PedroArantesPunx/domino-tech-brew-dashboard.git
cd domino-tech-brew-dashboard
```

### 2. Configure as Variáveis de Ambiente

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Adicione seu token do Slack:

```env
SLACK_BOT_TOKEN=xoxb-SEU-TOKEN-AQUI
CHANNEL_ID=C09LD4K2GAH
PORT=3001
NODE_ENV=production
```

### 3. Inicie com Docker Compose

```bash
docker compose up -d
```

### 4. Acesse o Dashboard

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/health

## 📡 Endpoints da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Health check do backend |
| GET | `/api/dashboard-data` | Dados processados para o dashboard |
| GET | `/api/data` | Todos os dados armazenados |
| GET | `/api/fetch-messages` | Buscar mensagens do Slack manualmente |
| GET | `/api/list-channels` | Listar canais disponíveis |
| GET | `/api/debug-messages` | Ver últimas mensagens brutas do Slack |
| DELETE | `/api/data` | Limpar todos os dados |
| POST | `/api/test-parser` | Testar parser com mensagem customizada |

## 🐳 Docker

### Usar Imagens Pré-buildadas (Recomendado)

```bash
docker compose pull
docker compose up -d
```

### Build Local

```bash
# Backend
docker build -t dashboard-backend ./backend

# Frontend
docker build -t dashboard-frontend .
```

### Imagens no Docker Hub

- **Backend**: `pedropunx/domino-tech-backend:latest`
- **Frontend**: `pedropunx/domino-tech-frontend:latest`

## 🌐 Deploy em Produção

Consulte o guia completo: [DEPLOY-PRODUCTION.md](./DEPLOY-PRODUCTION.md)

### Resumo:

1. Configure DNS apontando para seu servidor
2. Clone o repositório no servidor
3. Configure `.env` com token do Slack
4. Execute `docker compose up -d`
5. (Opcional) Configure HTTPS com Let's Encrypt

## 📂 Estrutura do Projeto

```
📦 domino-tech-brew-dashboard/
├── 📂 backend/                 # Backend Node.js
│   ├── 📄 server.js           # Código principal
│   ├── 📄 package.json        # Dependências
│   ├── 🐳 Dockerfile          # Build do backend
│   ├── 📄 .env.example        # Exemplo de variáveis
│   └── 📄 .env               # Variáveis reais (não versionado)
├── 📂 src/                    # Frontend React
│   ├── 📄 App.js             # Componente principal
│   └── 📄 index.js           # Entry point
├── 📂 public/                 # Arquivos estáticos
├── 🐳 Dockerfile              # Build do frontend
├── 🐳 docker-compose.yml      # Orquestração
├── 📄 nginx.conf              # Configuração Nginx
├── 📄 package.json            # Dependências do frontend
├── 📘 README.md               # Este arquivo
├── 📘 DEPLOY-PRODUCTION.md    # Guia de deploy
└── 📘 DOCKER-README.md        # Guia Docker detalhado
```

## 🔄 Comandos Úteis

### Desenvolvimento

```bash
# Ver logs
docker compose logs -f

# Logs do backend
docker compose logs -f backend

# Logs do frontend
docker compose logs -f frontend

# Reiniciar serviço
docker compose restart backend

# Parar tudo
docker compose down
```

### Atualização

```bash
# Baixar versões mais recentes
docker compose pull

# Recriar containers
docker compose up -d --force-recreate
```

### Backup

```bash
# Backup dos dados
docker cp dashboard-backend:/app/alertas.json ./backup-$(date +%Y%m%d).json
```

## 🔧 Configuração do Slack

### 1. Criar Slack App

1. Acesse https://api.slack.com/apps
2. Clique em "Create New App"
3. Escolha "From scratch"
4. Dê um nome e selecione o workspace

### 2. Adicionar Permissões (Scopes)

Em **OAuth & Permissions → Bot Token Scopes**, adicione:

- `channels:history` - Ler histórico de canais públicos
- `channels:read` - Ver informações de canais públicos
- `groups:history` - Ler histórico de canais privados
- `groups:read` - Ver informações de canais privados
- `chat:write` - (Opcional) Enviar mensagens

### 3. Instalar App no Workspace

1. Em **OAuth & Permissions**, clique em "Install to Workspace"
2. Autorize as permissões
3. Copie o **Bot User OAuth Token** (começa com `xoxb-`)

### 4. Adicionar Bot ao Canal

1. No Slack, vá ao canal desejado
2. Digite `/invite @NomeDoSeuBot`
3. Copie o Channel ID (clique no nome do canal → More → Copy link, o ID está na URL)

## 📊 Tipos de Relatórios Suportados

### 1. Relatório de Performance de Produtos

Métricas de Cassino e Sportsbook:
- GGR Total
- NGR Total
- Turnover Total
- GGR e Turnover por produto

### 2. Relatório Time de Risco

Métricas operacionais:
- GGR e NGR
- Depósitos e Saques
- Fluxo Líquido
- Jogadores Únicos
- Apostadores e Depositantes

## 🐛 Troubleshooting

### Container não inicia

```bash
docker compose logs backend
docker compose logs frontend
```

### Erro "missing_scope"

Verifique se o token do Slack tem todas as permissões necessárias:
- `channels:history`
- `channels:read`
- `groups:history`
- `groups:read`

### Frontend não conecta no backend

Verifique se ambos os containers estão na mesma network:

```bash
docker network inspect domino_techandbrew_dashboard-network
```

### Dados não aparecem

Force uma busca manual:

```bash
curl http://localhost:3001/api/fetch-messages
```

## 📈 Roadmap

- [ ] Gráficos interativos com histórico
- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Alertas customizáveis por email
- [ ] Dashboard mobile responsivo
- [ ] Múltiplos canais/workspaces
- [ ] Autenticação de usuários

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

**Pedro Arantes**
- GitHub: [@PedroArantesPunx](https://github.com/PedroArantesPunx)
- Docker Hub: [pedropunx](https://hub.docker.com/u/pedropunx)

## 🙏 Agradecimentos

- Time Domino Tech & Brew
- Slack API Documentation
- React Community
- Docker Community

---

⭐ Se este projeto te ajudou, considere dar uma estrela!

<!-- Trigger CI/CD -->
