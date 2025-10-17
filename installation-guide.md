# 🚀 GUIA COMPLETO DE INSTALAÇÃO - Dashboard Slack

Este guia vai te ajudar a instalar e configurar tudo do zero, mesmo sem experiência técnica.

---

## 📋 PRÉ-REQUISITOS

Antes de começar, você precisa instalar:

### 1. Node.js (JavaScript Runtime)

**Windows:**
1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS (recomendada)**
3. Execute o instalador
4. Clique em "Next" até finalizar
5. **Reinicie o computador**

**Mac:**
1. Acesse: https://nodejs.org/
2. Baixe a versão **LTS (recomendada)**
3. Abra o arquivo .pkg
4. Siga as instruções

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verificar instalação:**
Abra o terminal/prompt de comando e digite:
```bash
node --version
npm --version
```
Deve aparecer os números das versões instaladas.

---

## 📁 PARTE 1: CRIAR O PROJETO

### Passo 1: Criar a pasta do projeto

**Windows:**
1. Abra o **Explorador de Arquivos**
2. Navegue até `Documentos`
3. Clique com botão direito → **Novo** → **Pasta**
4. Nomeie: `slack-dashboard`

**Mac/Linux:**
```bash
mkdir ~/slack-dashboard
cd ~/slack-dashboard
```

### Passo 2: Abrir terminal na pasta

**Windows:**
1. Entre na pasta `slack-dashboard`
2. Na barra de endereços, digite `cmd` e pressione Enter
3. O **Prompt de Comando** vai abrir nessa pasta

**Mac:**
1. Abra o **Terminal**
2. Digite: `cd ~/slack-dashboard`

**Linux:**
```bash
cd ~/slack-dashboard
```

### Passo 3: Criar os arquivos do projeto

No terminal, digite os comandos abaixo (um de cada vez):

```bash
# Inicializar projeto Node.js
npm init -y

# Instalar dependências
npm install @slack/web-api express cors

# Instalar ferramenta de desenvolvimento
npm install --save-dev nodemon
```

**O que cada comando faz?**
- `npm init -y` → Cria o projeto Node.js
- `npm install` → Instala as bibliotecas necessárias
- `@slack/web-api` → Para conectar com o Slack
- `express` → Servidor web
- `cors` → Permite conexão entre frontend e backend
- `nodemon` → Reinicia servidor automaticamente ao editar código

---

## 📝 PARTE 2: CRIAR OS ARQUIVOS

### Passo 1: Criar o arquivo server.js

1. Abra a pasta `slack-dashboard` no **Bloco de Notas** (Windows) ou **TextEdit** (Mac)
2. Crie um novo arquivo chamado `server.js`
3. **Copie todo o código** que forneci anteriormente (Backend Node.js - Slack Integration)
4. Cole no arquivo `server.js`
5. Salve o arquivo

### Passo 2: Atualizar o package.json

Abra o arquivo `package.json` e adicione esta linha dentro de `"scripts"`:

```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

O arquivo final deve ficar assim:
```json
{
  "name": "slack-dashboard",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "@slack/web-api": "^6.12.0",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

---

## 🔑 PARTE 3: CONFIGURAR O SLACK APP

### Passo 1: Criar o Slack App

1. Acesse: https://api.slack.com/apps
2. Clique em **"Create New App"**
3. Escolha **"From scratch"**
4. Preencha:
   - **App Name**: `Dashboard Financeiro`
   - **Workspace**: Seu workspace
5. Clique em **"Create App"**

### Passo 2: Configurar Permissões

1. No menu lateral esquerdo, clique em **"OAuth & Permissions"**
2. Role até a seção **"Scopes"**
3. Em **"Bot Token Scopes"**, clique em **"Add an OAuth Scope"**
4. Adicione as seguintes permissões:
   - `channels:history`
   - `channels:read`
   - `chat:write` (opcional)

### Passo 3: Instalar o App

1. Role até o topo da página **"OAuth & Permissions"**
2. Clique em **"Install to Workspace"**
3. Clique em **"Allow"**
4. ⚠️ **IMPORTANTE**: Copie o **"Bot User OAuth Token"**
   - Ele começa com `xoxb-`
   - Exemplo: `xoxb-SEU-TOKEN-AQUI`

### Passo 4: Adicionar o Bot ao Canal

1. Abra o **Slack**
2. Vá até o canal onde os alertas são enviados
3. Digite: `/invite @Dashboard Financeiro`
4. Pressione Enter
5. O bot agora pode ler as mensagens desse canal

---

## ⚙️ PARTE 4: CONFIGURAR O BACKEND

### Passo 1: Adicionar o Token do Slack

Abra o arquivo `server.js` e encontre esta linha:

```javascript
const SLACK_BOT_TOKEN = 'xoxb-SEU-TOKEN-AQUI';
```

Substitua `'xoxb-SEU-TOKEN-AQUI'` pelo token que você copiou:

```javascript
const SLACK_BOT_TOKEN = 'xoxb-SEU-TOKEN-AQUI';
```

### Passo 2: Descobrir o ID do Canal

1. **Inicie o servidor** (ainda sem o CHANNEL_ID configurado):
```bash
npm start
```

2. Abra o navegador e acesse:
```
http://localhost:3001/api/list-channels
```

3. Você verá uma lista com todos os canais. Exemplo:
```json
{
  "channels": [
    {
      "id": "C01234ABCDE",
      "name": "alertas-financeiro",
      "is_member": true
    },
    {
      "id": "C56789FGHIJ",
      "name": "geral",
      "is_member": true
    }
  ]
}
```

4. **Encontre o canal** onde os alertas são enviados
5. **Copie o ID** (exemplo: `C01234ABCDE`)

### Passo 3: Configurar o ID do Canal

Volte ao arquivo `server.js` e encontre:

```javascript
const CHANNEL_ID = 'SEU-CHANNEL-ID-AQUI';
```

Substitua pelo ID do canal:

```javascript
const CHANNEL_ID = 'C01234ABCDE';
```

### Passo 4: Salvar e Reiniciar

1. **Salve o arquivo** `server.js`
2. No terminal, pressione `Ctrl+C` para parar o servidor
3. Inicie novamente:
```bash
npm start
```

---

## ✅ PARTE 5: TESTAR A INTEGRAÇÃO

### Teste 1: Buscar mensagens do Slack

Abra o navegador e acesse:
```
http://localhost:3001/api/fetch-messages
```

Você deve ver algo como:
```json
{
  "success": true,
  "message": "Mensagens processadas",
  "count": 24
}
```

### Teste 2: Ver os dados salvos

Acesse:
```
http://localhost:3001/api/data
```

Você verá todos os dados extraídos das mensagens do Slack!

### Teste 3: Abrir o Dashboard

Agora você pode usar o dashboard React que atualizei. Ele vai se conectar automaticamente ao backend e mostrar os gráficos!

---

## 🎯 PARTE 6: USAR O DASHBOARD

### Opção 1: Usar no Claude (mais fácil)

O dashboard React que criei já está funcionando aqui no Claude. Basta:

1. Garantir que o backend está rodando (`npm start`)
2. Clicar em "Buscar do Slack" no dashboard
3. Os gráficos vão aparecer automaticamente!

### Opção 2: Hospedar localmente

Se quiser rodar o frontend separadamente:

1. Crie um arquivo HTML:
```bash
# Na pasta slack-dashboard
mkdir frontend
cd frontend
```

2. Crie `index.html` e cole o código React
3. Instale um servidor simples:
```bash
npx serve
```

---

## 🔄 COMANDOS ÚTEIS

### Iniciar o servidor
```bash
npm start
```

### Iniciar com auto-reload (recomendado para desenvolvimento)
```bash
npm run dev
```

### Parar o servidor
Pressione `Ctrl+C` no terminal

### Ver logs em tempo real
O terminal vai mostrar todas as ações:
```
✅ Dados salvos com sucesso!
📥 Buscando mensagens do Slack...
✅ Encontradas 24 mensagens
```

---

## 🐛 SOLUÇÃO DE PROBLEMAS

### Erro: "Cannot find module"
**Solução:** Instale as dependências:
```bash
npm install
```

### Erro: "ECONNREFUSED" ou "Cannot connect"
**Causa:** O backend não está rodando
**Solução:** 
```bash
npm start
```

### Erro: "invalid_auth"
**Causa:** Token do Slack inválido
**Solução:** 
1. Verifique se copiou o token completo
2. Certifique-se de que começa com `xoxb-`
3. Gere um novo token se necessário

### Erro: "channel_not_found"
**Causa:** ID do canal incorreto
**Solução:**
1. Acesse `/api/list-channels`
2. Copie o ID correto
3. Verifique se o bot foi adicionado ao canal (`/invite`)

### Erro: "Port 3001 already in use"
**Causa:** Outro processo está usando a porta
**Solução:**
No arquivo `server.js`, mude a porta:
```javascript
const PORT = 3002; // ou qualquer outra porta
```

### Nenhum dado aparece no dashboard
**Causas possíveis:**
1. Backend não está rodando → Execute `npm start`
2. URL do backend errada → Verifique `API_URL` no dashboard
3. Não há mensagens no Slack → Envie um alerta de teste
4. Parser não reconhece o formato → Teste com `/api/test-parser`

---

## 📊 ENDPOINTS DA API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/list-channels` | Lista todos os canais |
| GET | `/api/fetch-messages` | Busca novas mensagens do Slack |
| GET | `/api/data` | Retorna todos os dados salvos |
| DELETE | `/api/data` | Limpa todos os dados |
| POST | `/api/test-parser` | Testa o parser com mensagem |

---

## 🎉 PRÓXIMOS PASSOS

Agora que tudo está funcionando, você pode:

1. ✅ **Deixar rodando 24/7**: O servidor busca mensagens automaticamente a cada hora
2. 📱 **Acessar de outros dispositivos**: Use o IP local (ex: `http://192.168.1.100:3001`)
3. ☁️ **Hospedar na nuvem**: Deploy no Heroku, Railway, ou DigitalOcean
4. 📧 **Adicionar notificações**: Email quando métricas ultrapassam limites
5. 📈 **Mais gráficos**: Adicionar novos indicadores e visualizações

---

## 💡 DICAS IMPORTANTES

- ⚠️ **Nunca compartilhe seu token do Slack** - Ele dá acesso total ao seu workspace
- 🔄 **Use nodemon** para desenvolvimento (`npm run dev`)
- 💾 **Faça backup** do arquivo `alertas.json` regularmente
- 📝 **Mantenha logs** para debugar problemas
- 🔒 **Use variáveis de ambiente** em produção (arquivo `.env`)

---

## 📞 SUPORTE

Se tiver dúvidas ou problemas:

1. Verifique os **logs do terminal**
2. Teste cada **endpoint individualmente**
3. Use o endpoint `/api/test-parser` para debugar
4. Me chame e explique o erro detalhadamente!

---

**🎊 Parabéns! Seu dashboard está pronto!**