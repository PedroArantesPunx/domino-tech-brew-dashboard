# 🤖 Deploy Automático do Backend

Sistema de deploy automático do backend para o servidor doméstico (192.168.1.13) via GitHub Actions.

## 📋 Como Funciona

1. **Push para GitHub** → Trigger automático
2. **GitHub Actions** → Conecta via SSH no notebook
3. **Servidor** → Pull + Rebuild + Restart automático

---

## ⚙️ Configuração (FAZER UMA VEZ)

### 1. Adicionar Secrets no GitHub

Vá em: `github.com/PedroArantesPunx/domino-tech-brew-dashboard/settings/secrets/actions`

Adicione 3 secrets:

```
BACKEND_HOST = 192.168.1.13
BACKEND_USER = pedro
BACKEND_PASSWORD = p
```

### 2. Habilitar GitHub Actions

No repositório, vá em **Actions** → **Enable workflows**

---

## 🚀 Uso Automático

**Sempre que você fizer push de alterações no backend:**

```bash
# Fazer alterações no código
git add backend/
git commit -m "fix: corrigir endpoint"
git push origin main
```

O GitHub Actions automaticamente:
1. ✅ Detecta alteração em `backend/`
2. ✅ Conecta via SSH no 192.168.1.13
3. ✅ Faz git pull
4. ✅ Rebuild da imagem Docker
5. ✅ Restart do container
6. ✅ Verifica health check

**Ver progresso:** `github.com/PedroArantesPunx/domino-tech-brew-dashboard/actions`

---

## 🔧 Deploy Manual (Fallback)

Se GitHub Actions não funcionar, use este script:

```bash
./scripts/deploy-backend-manual.sh
```

Ou execute diretamente:

```bash
ssh pedro@192.168.1.13 "cd domino-dashboard && \
  git pull origin main && \
  docker stop dashboard-backend && \
  docker rm dashboard-backend && \
  docker build -t pedropunx/domino-tech-backend:latest ./backend && \
  docker compose up -d backend && \
  sleep 15 && \
  docker compose ps && \
  curl -s http://localhost:3001/api/health"
```

---

## 📊 Arquitetura

```
┌─────────────────┐
│  GitHub Repo    │
│   (main branch) │
└────────┬────────┘
         │ push
         ▼
┌─────────────────┐
│ GitHub Actions  │
│  (Ubuntu Runner)│
└────────┬────────┘
         │ SSH
         ▼
┌─────────────────────────┐
│  Servidor Backend       │
│  192.168.1.13:3001      │
│  (Notebook em casa)     │
│                         │
│  1. git pull            │
│  2. docker build        │
│  3. docker restart      │
└─────────────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Frontend (Vercel)      │
│  techandbrew.com.br     │
│                         │
│  Deploy automático ✅   │
└─────────────────────────┘
```

---

## 🔍 Troubleshooting

### Erro: "Permission denied"
```bash
# No servidor (192.168.1.13):
su -c "usermod -aG docker pedro"
```

### Erro: "Host key verification failed"
- GitHub Actions já usa `StrictHostKeyChecking=no`
- Não precisa configurar SSH keys

### Ver logs do deploy
```bash
# Localmente:
gh run list --limit 5
gh run view --log

# Ou no browser:
# github.com/PedroArantesPunx/domino-tech-brew-dashboard/actions
```

### Container não inicia
```bash
ssh pedro@192.168.1.13
cd domino-dashboard
docker logs dashboard-backend --tail 50
```

---

## 🎯 Vantagens

✅ Deploy automático quando push para `main`
✅ Só faz deploy se houver mudanças em `backend/`
✅ Frontend (Vercel) e Backend sincronizados
✅ Logs detalhados de cada deploy
✅ Rollback fácil (git revert + push)
✅ Sem necessidade de SCP manual

---

## 📝 Notas Importantes

1. **IP Fixo:** Certifique-se que 192.168.1.13 é IP fixo no router
2. **Porta 22:** SSH deve estar aberto no firewall
3. **Docker:** Usuário pedro deve estar no grupo docker
4. **Git:** Repositório deve estar configurado em ~/domino-dashboard
5. **VPN:** Se usar VPN para acessar rede doméstica, configure IP da VPN nos secrets

---

## 🔐 Segurança

**Melhorias futuras (opcional):**

1. **SSH Key em vez de senha:**
   ```bash
   ssh-keygen -t ed25519 -C "github-actions"
   ssh-copy-id pedro@192.168.1.13
   # Adicionar chave privada como secret BACKEND_SSH_KEY
   ```

2. **Webhook direto (sem GitHub Actions):**
   - Instalar webhook listener no servidor
   - GitHub → POST direto para 192.168.1.13

3. **CI/CD mais robusto:**
   - Tests antes do deploy
   - Blue-green deployment
   - Automatic rollback on failure

---

**Criado:** 2025-11-06
**Última atualização:** 2025-11-06
