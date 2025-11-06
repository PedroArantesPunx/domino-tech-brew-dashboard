# 🔐 GitHub Secrets & Actions - Guia Completo

Documentação completa sobre como funcionam e como configurar GitHub Secrets e Actions para deploy automático.

---

## 📚 Índice

1. [Como Funcionam os Secrets](#como-funcionam-os-secrets)
2. [Configuração via Browser](#configuração-via-browser)
3. [Configuração via Terminal (CLI)](#configuração-via-terminal-cli)
4. [Como o GitHub Actions Usa os Secrets](#como-o-github-actions-usa-os-secrets)
5. [Testando o Deploy Automático](#testando-o-deploy-automático)
6. [Troubleshooting](#troubleshooting)

---

## 🔑 Como Funcionam os Secrets

### Arquitetura

```
┌─────────────────────────────────────────────┐
│  .github/workflows/deploy-backend.yml       │
│  (CÓDIGO PÚBLICO - visível no repositório)  │
│                                             │
│  with:                                      │
│    host: ${{ secrets.BACKEND_HOST }}        │
│    username: ${{ secrets.BACKEND_USER }}    │
│    password: ${{ secrets.BACKEND_PASSWORD }}│
│           ↑                                 │
│           └─ Referência ao secret           │
└─────────────────────────────────────────────┘
                    │
                    │ GitHub substitui em runtime
                    ▼
┌─────────────────────────────────────────────┐
│  GitHub Repository Secrets                  │
│  (CONFIGURAÇÃO PRIVADA - não visível)       │
│                                             │
│  BACKEND_HOST = "192.168.1.13"              │
│  BACKEND_USER = "pedro"                     │
│  BACKEND_PASSWORD = "p"                     │
└─────────────────────────────────────────────┘
                    │
                    │ Durante execução
                    ▼
┌─────────────────────────────────────────────┐
│  GitHub Actions Runner Executa:             │
│                                             │
│  ssh pedro@192.168.1.13                     │
│      ↑           ↑                          │
│  (substituído) (substituído)                │
└─────────────────────────────────────────────┘
```

### A Sintaxe `${{ secrets.NOME }}`

```yaml
${{ secrets.BACKEND_HOST }}
 │   │      └─────────────── Nome escolhido por você
 │   └──────────────────────── Namespace de secrets
 └──────────────────────────── Sintaxe do GitHub Actions
```

**Como funciona:**
1. Você define o **nome** no código (ex: `BACKEND_HOST`)
2. Você configura o **valor** no GitHub (ex: `192.168.1.13`)
3. Durante execução, GitHub **substitui** automaticamente
4. O valor **nunca** aparece nos logs (GitHub oculta automaticamente)

### Vantagens

✅ **Código público, dados privados**
```yaml
# ✅ Seguro - pode commitar
host: ${{ secrets.BACKEND_HOST }}

# ❌ NUNCA faça isso
host: "192.168.1.13"
```

✅ **Mudança sem commit**
- Mudou IP? Atualiza o secret, sem precisar alterar código
- Mudou senha? Apenas reconfigura o secret

✅ **Criptografia automática**
- GitHub encrypta todos os secrets
- Não aparecem nos logs (`***`)
- Apenas o runner em execução tem acesso

---

## 🌐 Configuração via Browser

### Passo 1: Acessar Configurações

1. Vá para o repositório no GitHub
2. Clique em **Settings** (⚙️)
3. No menu lateral, clique em **Secrets and variables** → **Actions**

**URL direta:**
```
https://github.com/PedroArantesPunx/domino-tech-brew-dashboard/settings/secrets/actions
```

### Passo 2: Adicionar Secrets

Clique em **"New repository secret"** para cada um:

#### Secret 1: BACKEND_HOST
```
Name: BACKEND_HOST
Secret: 192.168.1.13
```

#### Secret 2: BACKEND_USER
```
Name: BACKEND_USER
Secret: pedro
```

#### Secret 3: BACKEND_PASSWORD
```
Name: BACKEND_PASSWORD
Secret: p
```

### Passo 3: Verificar

Após adicionar, você verá:
```
✓ BACKEND_HOST       Updated X minutes ago
✓ BACKEND_USER       Updated X minutes ago
✓ BACKEND_PASSWORD   Updated X minutes ago
```

**Nota:** Você pode ver que os secrets existem, mas **não pode ver os valores**.

---

## 💻 Configuração via Terminal (CLI)

### Pré-requisito: Instalar GitHub CLI

```bash
# Verificar se já está instalado
gh --version

# Se não estiver instalado:
# Fedora/RHEL
sudo dnf install gh

# Ubuntu/Debian
sudo apt install gh

# Arch Linux
sudo pacman -S github-cli
```

### Passo 1: Autenticar

```bash
gh auth login
```

Escolha as opções:
```
? What account do you want to log into? GitHub.com
? What is your preferred protocol for Git operations? HTTPS
? Authenticate Git with your GitHub credentials? Yes
? How would you like to authenticate GitHub CLI? Login with a web browser
```

Copie o código que aparece e cole no navegador.

### Passo 2: Verificar Autenticação

```bash
gh auth status
```

Deve mostrar:
```
✓ Logged in to github.com as PedroArantesPunx
✓ Git operations for https://github.com configured to use https protocol.
✓ Token: *******************
```

### Passo 3: Adicionar Secrets via CLI

```bash
# Navegar para o diretório do projeto
cd /home/pedro/Documentos/domino_techandbrew

# Adicionar cada secret
gh secret set BACKEND_HOST --body "192.168.1.13"
gh secret set BACKEND_USER --body "pedro"
gh secret set BACKEND_PASSWORD --body "p"
```

**Output esperado:**
```
✓ Set Actions secret BACKEND_HOST for PedroArantesPunx/domino-tech-brew-dashboard
✓ Set Actions secret BACKEND_USER for PedroArantesPunx/domino-tech-brew-dashboard
✓ Set Actions secret BACKEND_PASSWORD for PedroArantesPunx/domino-tech-brew-dashboard
```

### Passo 4: Listar Secrets (Verificar)

```bash
gh secret list
```

**Output esperado:**
```
BACKEND_HOST       Updated 2024-11-06
BACKEND_USER       Updated 2024-11-06
BACKEND_PASSWORD   Updated 2024-11-06
```

### Comandos Úteis da CLI

```bash
# Ver detalhes de um secret (não mostra o valor)
gh secret list

# Atualizar um secret
gh secret set BACKEND_HOST --body "192.168.1.14"

# Deletar um secret
gh secret delete BACKEND_HOST

# Adicionar secret via prompt interativo (mais seguro para senhas)
gh secret set BACKEND_PASSWORD
# Paste your secret: [digite aqui sem aparecer]
```

---

## 🔄 Como o GitHub Actions Usa os Secrets

### No Código do Workflow

Arquivo: `.github/workflows/deploy-backend.yml`

```yaml
name: Deploy Backend to Home Server

on:
  push:
    branches:
      - main
    paths:
      - 'backend/**'  # ← Só dispara se houver mudança aqui

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.BACKEND_HOST }}      # ← Substitui por "192.168.1.13"
          username: ${{ secrets.BACKEND_USER }}  # ← Substitui por "pedro"
          password: ${{ secrets.BACKEND_PASSWORD }} # ← Substitui por "p"
          script: |
            cd domino-dashboard
            git pull origin main
            docker stop dashboard-backend
            docker rm dashboard-backend
            docker build -t pedropunx/domino-tech-backend:latest ./backend
            docker compose up -d backend
```

### Processo de Substituição

**Antes da execução (código):**
```yaml
host: ${{ secrets.BACKEND_HOST }}
```

**Durante a execução (runtime):**
```yaml
host: "192.168.1.13"
```

**Nos logs (visível no GitHub):**
```
Connecting to ***
```

---

## 🧪 Testando o Deploy Automático

### Teste 1: Verificar Workflow

```bash
cd /home/pedro/Documentos/domino_techandbrew

# Ver workflows disponíveis
gh workflow list
```

**Output esperado:**
```
Deploy Backend to Home Server  active  808f27f
```

### Teste 2: Fazer Mudança no Backend

```bash
# Fazer uma mudança trivial para testar
echo "// Test deploy" >> backend/server.js

# Commit e push
git add backend/server.js
git commit -m "test: trigger deploy automático"
git push origin main
```

### Teste 3: Monitorar Execução em Tempo Real

```bash
# Ver últimas execuções
gh run list --limit 5

# Ver logs da última execução (em tempo real)
gh run watch

# Ou ver logs de uma execução específica
gh run view --log
```

**Output esperado:**
```
✓ Deploy Backend to Home Server #1 · 808f27f
  Triggered via push about 1 minute ago

deploy  Deploy to Backend Server via SSH  1m 23s

✓ 192.168.1.13: connected
✓ 192.168.1.13: docker build completed
✓ 192.168.1.13: container started
```

### Teste 4: Verificar no Servidor

```bash
# SSH no servidor e verificar
ssh pedro@192.168.1.13
docker ps | grep dashboard-backend
docker logs dashboard-backend --tail 20
```

---

## 🐛 Troubleshooting

### Erro: "Secret not found"

**Problema:**
```
Error: Secret BACKEND_HOST not found
```

**Solução:**
```bash
# Verificar se o secret existe
gh secret list

# Se não existir, criar
gh secret set BACKEND_HOST --body "192.168.1.13"
```

### Erro: "Permission denied (publickey)"

**Problema:** GitHub Actions não consegue conectar via SSH

**Solução 1 - Verificar secrets:**
```bash
# Verificar se os secrets estão configurados
gh secret list

# Devem existir todos os 3
BACKEND_HOST
BACKEND_USER
BACKEND_PASSWORD
```

**Solução 2 - Testar SSH manualmente:**
```bash
ssh pedro@192.168.1.13
# Se pedir senha, funciona (password auth está OK)
```

### Erro: "Host is unreachable"

**Problema:** Servidor não está acessível

**Checklist:**
- [ ] Notebook está ligado?
- [ ] Conectado na mesma rede?
- [ ] IP está correto (192.168.1.13)?
- [ ] Porta 22 (SSH) está aberta?

```bash
# Testar conectividade
ping 192.168.1.13

# Testar SSH
ssh pedro@192.168.1.13
```

### Ver Logs Detalhados do Workflow

```bash
# Listar execuções
gh run list --limit 10

# Ver detalhes de uma execução
gh run view [RUN_ID]

# Ver logs completos
gh run view [RUN_ID] --log

# Ver apenas logs de falhas
gh run view [RUN_ID] --log-failed
```

### Workflow Não Dispara

**Verificar:**

1. **Arquivo no caminho correto?**
```bash
ls -la .github/workflows/deploy-backend.yml
```

2. **Push foi para branch main?**
```bash
git branch
# Deve mostrar: * main
```

3. **Houve mudança em backend/?**
```bash
git log --oneline -1
# Commit deve incluir arquivos de backend/
```

4. **Workflow está ativo?**
```bash
gh workflow list
# Status deve ser "active"
```

### Reexecutar Workflow Manualmente

```bash
# Listar workflows
gh workflow list

# Executar manualmente
gh workflow run "Deploy Backend to Home Server"

# Ver status
gh run watch
```

---

## 📊 Comandos Úteis - Resumo

### GitHub CLI - Secrets

```bash
# Listar todos os secrets
gh secret list

# Adicionar secret
gh secret set NOME --body "valor"

# Adicionar via prompt (mais seguro)
gh secret set NOME

# Deletar secret
gh secret delete NOME
```

### GitHub CLI - Workflows

```bash
# Listar workflows
gh workflow list

# Listar execuções
gh run list --limit 10

# Ver execução em tempo real
gh run watch

# Ver logs de execução
gh run view --log

# Reexecutar workflow
gh workflow run "NOME_DO_WORKFLOW"

# Cancelar execução
gh run cancel [RUN_ID]
```

### Git - Deploy

```bash
# Fluxo completo de deploy
git add backend/
git commit -m "feat: nova funcionalidade"
git push origin main

# Monitorar deploy
gh run watch
```

---

## 🎯 Exemplo Completo - Do Zero ao Deploy

### 1. Configurar Secrets (primeira vez)

```bash
cd /home/pedro/Documentos/domino_techandbrew

# Autenticar (se ainda não fez)
gh auth login

# Adicionar secrets
gh secret set BACKEND_HOST --body "192.168.1.13"
gh secret set BACKEND_USER --body "pedro"
gh secret set BACKEND_PASSWORD --body "p"

# Verificar
gh secret list
```

### 2. Fazer Alteração no Backend

```bash
# Editar código
vim backend/server.js

# Commit
git add backend/
git commit -m "feat: adicionar novo endpoint"
```

### 3. Deploy Automático

```bash
# Push (dispara GitHub Actions)
git push origin main

# Acompanhar em tempo real
gh run watch
```

### 4. Verificar Resultado

```bash
# Ver logs do deploy
gh run view --log

# Testar no servidor
curl http://192.168.1.13:3001/api/health

# Ver no navegador
# https://github.com/PedroArantesPunx/domino-tech-brew-dashboard/actions
```

---

## 🔒 Boas Práticas de Segurança

### O Que FAZER ✅

- Usar secrets para **todas** as informações sensíveis
- Nomes descritivos: `BACKEND_HOST`, `DATABASE_URL`
- Atualizar secrets quando mudar credenciais
- Usar GitHub CLI para adicionar (mais seguro que browser)
- Verificar logs para confirmar que valores não vazam

### O Que NÃO FAZER ❌

- **NUNCA** commitar senhas no código
- **NUNCA** usar `echo` de secrets nos workflows (pode vazar)
- **NUNCA** compartilhar secrets via chat/email
- **NUNCA** usar mesma senha do GitHub no BACKEND_PASSWORD

### Exemplo de Uso Seguro

```yaml
# ✅ BOM
- name: Deploy
  env:
    HOST: ${{ secrets.BACKEND_HOST }}
  run: ssh $HOST "docker restart app"

# ❌ RUIM - pode vazar nos logs
- name: Deploy
  run: echo "Host is ${{ secrets.BACKEND_HOST }}"
```

---

## 📚 Referências

- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [GitHub CLI Documentation](https://cli.github.com/manual/)
- [SSH Action Documentation](https://github.com/appleboy/ssh-action)
- Arquivo relacionado: `DEPLOY-BACKEND-AUTO.md`
- Script manual: `scripts/deploy-backend-manual.sh`

---

**Criado:** 2025-11-06
**Última atualização:** 2025-11-06
**Versão:** 1.0.0
