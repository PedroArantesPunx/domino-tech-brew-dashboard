# 🚀 Deploy em Produção - Dashboard Slack Domino Tech & Brew

## 📋 Pré-requisitos no Servidor

- ✅ Docker instalado
- ✅ Acesso SSH ao servidor
- ✅ Domínio `techandbrew.com.br` apontando para o IP do servidor
- ✅ Portas 80 e 443 abertas no firewall

## 🔧 Passo a Passo

### 1. Conectar ao Servidor

```bash
ssh seu-usuario@techandbrew.com.br
```

### 2. Instalar Docker (se necessário)

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Fazer logout e login novamente
```

### 3. Criar Estrutura de Diretórios

```bash
mkdir -p ~/domino-dashboard
cd ~/domino-dashboard
mkdir -p backend
```

### 4. Configurar Variáveis de Ambiente

Crie o arquivo `backend/.env`:

```bash
nano backend/.env
```

Cole o seguinte conteúdo (substitua com seus dados reais):

```env
# Configurações do Slack
SLACK_BOT_TOKEN=xoxb-SEU-TOKEN-AQUI
CHANNEL_ID=C09LD4K2GAH

# Configurações do servidor
PORT=3001
NODE_ENV=production

# Configurações opcionais
LOG_LEVEL=info
DATA_RETENTION_DAYS=30
```

Salve com `Ctrl+O`, Enter, `Ctrl+X`

### 5. Criar docker-compose.yml

```bash
nano docker-compose.yml
```

Cole o seguinte conteúdo:

```yaml
version: '3.8'

services:
  backend:
    image: pedropunx/domino-tech-backend:latest
    container_name: dashboard-backend
    restart: unless-stopped
    env_file:
      - ./backend/.env
    ports:
      - "3001:3001"
    networks:
      - dashboard-network
    volumes:
      - backend-data:/app
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3001/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: pedropunx/domino-tech-frontend:latest
    container_name: dashboard-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - dashboard-network
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

networks:
  dashboard-network:
    driver: bridge

volumes:
  backend-data:
    driver: local
```

Salve com `Ctrl+O`, Enter, `Ctrl+X`

### 6. Iniciar os Containers

```bash
docker compose pull
docker compose up -d
```

### 7. Verificar Logs

```bash
# Ver logs de todos os serviços
docker compose logs -f

# Ver logs apenas do backend
docker compose logs -f backend

# Ver logs apenas do frontend
docker compose logs -f frontend
```

### 8. Verificar Status

```bash
# Ver containers rodando
docker compose ps

# Testar health do backend
curl http://localhost:3001/api/health

# Testar dados do dashboard
curl http://localhost:3001/api/dashboard-data
```

## 🔒 Configurar HTTPS com Let's Encrypt (Opcional mas Recomendado)

### 1. Instalar Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Parar o Nginx do Docker temporariamente

```bash
docker compose stop frontend
```

### 3. Gerar Certificado SSL

```bash
sudo certbot certonly --standalone -d techandbrew.com.br -d www.techandbrew.com.br
```

### 4. Atualizar nginx.conf

Crie um novo arquivo de configuração com suporte a HTTPS:

```bash
nano nginx-ssl.conf
```

Cole:

```nginx
# Redirecionar HTTP para HTTPS
server {
    listen 80;
    server_name techandbrew.com.br www.techandbrew.com.br;
    return 301 https://$server_name$request_uri;
}

# Servidor HTTPS
server {
    listen 443 ssl http2;
    server_name techandbrew.com.br www.techandbrew.com.br;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/techandbrew.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/techandbrew.com.br/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Servir arquivos estáticos
    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy para API do backend
    location /api {
        proxy_pass http://dashboard-backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Configurações de cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Segurança
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
```

### 5. Atualizar docker-compose.yml para usar SSL

Edite o serviço frontend:

```yaml
  frontend:
    image: pedropunx/domino-tech-frontend:latest
    container_name: dashboard-frontend
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    networks:
      - dashboard-network
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      backend:
        condition: service_healthy
```

### 6. Reiniciar containers

```bash
docker compose up -d --force-recreate frontend
```

## 🔄 Comandos Úteis

### Atualizar Imagens

```bash
# Baixar versões mais recentes
docker compose pull

# Recriar containers com novas imagens
docker compose up -d --force-recreate
```

### Backup dos Dados

```bash
# Backup do arquivo de dados
docker cp dashboard-backend:/app/alertas.json ./backup-$(date +%Y%m%d).json

# Backup com cron (executar diariamente)
crontab -e
# Adicionar: 0 2 * * * cd ~/domino-dashboard && docker cp dashboard-backend:/app/alertas.json ./backups/backup-$(date +\%Y\%m\%d).json
```

### Limpar Dados (se necessário)

```bash
# Limpar dados via API
curl -X DELETE http://localhost:3001/api/data

# Forçar busca de mensagens
curl http://localhost:3001/api/fetch-messages
```

### Logs e Monitoramento

```bash
# Ver logs em tempo real
docker compose logs -f

# Ver logs das últimas 100 linhas
docker compose logs --tail=100

# Ver uso de recursos
docker stats
```

### Parar e Remover Tudo

```bash
# Parar containers
docker compose down

# Parar e remover volumes (CUIDADO: perde dados!)
docker compose down -v
```

## 🌐 Acessar o Dashboard

Após o deploy:

- **HTTP**: http://techandbrew.com.br
- **HTTPS** (se configurado): https://techandbrew.com.br
- **API**: https://techandbrew.com.br/api

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker compose logs backend
docker compose logs frontend

# Verificar configurações
docker compose config
```

### Erro de conexão com Slack

```bash
# Verificar token
docker compose exec backend cat .env

# Testar conexão
docker compose exec backend wget -O- http://localhost:3001/api/list-channels
```

### Nginx não conecta no backend

```bash
# Verificar network
docker network inspect domino-dashboard_dashboard-network

# Testar do frontend para backend
docker compose exec frontend ping dashboard-backend
```

## 📞 Suporte

Para problemas:
1. Verifique os logs: `docker compose logs`
2. Verifique o status: `docker compose ps`
3. Verifique as variáveis de ambiente: `cat backend/.env`

## 🎉 Conclusão

Seu dashboard está rodando em produção em:
- **URL**: https://techandbrew.com.br
- **Atualização automática**: A cada 1 hora busca novas mensagens do Slack
- **Persistência**: Dados salvos em volume Docker
- **Health checks**: Monitoramento automático dos containers
