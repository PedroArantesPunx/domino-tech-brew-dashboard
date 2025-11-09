# Configuração Fingerprint.com Subdomain Integration

## 🎯 Objetivo
Evitar bloqueio do Enhanced Tracking Protection dos navegadores usando subdomain customizado `fp.techandbrew.com.br`.

## 📋 Checklist de Configuração

### ☐ Passo 1: Configurar no Fingerprint.com Dashboard

1. **Acesse**: https://dashboard.fingerprint.com
   - Faça login com suas credenciais

2. **Navegue para configurações**:
   - No menu lateral → **App Settings**
   - Clique em **Custom subdomain integration** (ou **Integrations** → **Subdomain**)

3. **Configure o subdomain**:
   ```
   Subdomain: fp.techandbrew.com.br
   Region: us (ou eu, escolha a mais próxima)
   ```

4. **Copie os valores fornecidos**:
   O Fingerprint.com vai fornecer algo como:
   ```
   CNAME Record:
   Name: fp.techandbrew.com.br
   Value: fpcdn.fingerprint.com (ou similar)
   ```

   ⚠️ **IMPORTANTE**: Anote exatamente o valor fornecido!

### ☐ Passo 2: Configurar DNS na Cloudflare

1. **Acesse Cloudflare Dashboard**:
   - https://dash.cloudflare.com
   - Selecione o domínio: `techandbrew.com.br`

2. **Vá para DNS**:
   - Menu lateral → **DNS** → **Records**

3. **Adicione novo registro CNAME**:
   ```
   Type: CNAME
   Name: fp
   Target: <VALOR FORNECIDO PELO FINGERPRINT.COM>
   Proxy status: DNS only (ícone CINZA, NÃO laranja)
   TTL: Auto
   ```

   ⚠️ **CRÍTICO**:
   - Proxy status DEVE ser "DNS only" (ícone cinza)
   - Se estiver laranja (Proxied), clique para desativar
   - Isso é necessário para o CNAME funcionar corretamente

4. **Salve o registro**

### ☐ Passo 3: Aguardar Propagação DNS

- **Tempo**: 5 minutos a 48 horas (geralmente 10-30 minutos)
- **Verificar propagação**:
  ```bash
  # No terminal:
  nslookup fp.techandbrew.com.br

  # Ou online:
  https://dnschecker.org/#CNAME/fp.techandbrew.com.br
  ```

### ☐ Passo 4: Verificar Configuração

1. **Aguarde deploy do Vercel** (automático, ~2 minutos)

2. **Teste o endpoint**:
   ```bash
   curl -I https://fp.techandbrew.com.br

   # Deve retornar 200 OK ou redirecionar para Fingerprint CDN
   ```

3. **Teste no navegador**:
   - Acesse: https://techandbrew.com.br
   - Faça login
   - Abra Console (F12)
   - Verifique se aparece: "✅ Dados do Fingerprint coletados"
   - NÃO deve aparecer erro de "blocked by Enhanced Tracking Protection"

## 🔍 Verificação Pós-Configuração

### Teste 1: DNS Funcionando
```bash
dig fp.techandbrew.com.br CNAME
# Deve retornar o valor do Fingerprint.com
```

### Teste 2: Coleta de Dados
```bash
# Fazer login via browser
# Console deve mostrar:
🔍 Obtendo configuração do Fingerprint...
🔍 Coletando dados do Fingerprint...
✅ Dados do Fingerprint coletados: {...}
✅ Dados enviados ao backend com sucesso
```

### Teste 3: Dados no Backend
```bash
# Obter token de autenticação
TOKEN=$(curl -s -X POST https://api-domino.techandbrew.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"domino2024"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['token'])")

# Verificar dados coletados
curl -s "https://api-domino.techandbrew.com.br/api/fingerprint/data" \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool

# Deve retornar array com dados de fingerprint
```

## ❌ Troubleshooting

### Problema: DNS não resolve
**Sintoma**: `nslookup fp.techandbrew.com.br` retorna "NXDOMAIN"

**Solução**:
1. Verificar se o registro CNAME foi criado corretamente na Cloudflare
2. Aguardar mais tempo (até 48h em casos extremos)
3. Verificar se o proxy está desativado (deve estar cinza)

### Problema: Still blocked by browser
**Sintoma**: Console mostra "blocked because Enhanced Tracking Protection is enabled"

**Possíveis causas**:
1. DNS ainda não propagou → Aguardar
2. Endpoint incorreto no código → Verificar `src/App.js:248`
3. Subdomain não configurado no Fingerprint.com → Refazer Passo 1

### Problema: CORS error
**Sintoma**: Console mostra erro de CORS ao acessar `fp.techandbrew.com.br`

**Solução**:
1. Verificar no Fingerprint.com dashboard se o subdomain está ativo
2. Verificar se a região está correta (us, eu, ap)
3. Aguardar alguns minutos após configuração

### Problema: 404 Not Found
**Sintoma**: `https://fp.techandbrew.com.br` retorna 404

**Solução**:
1. Verificar se o CNAME está apontando para o valor correto
2. Verificar no Fingerprint.com se o subdomain está ativo
3. Testar com `curl -v https://fp.techandbrew.com.br/v3/<API_KEY>/loader_v3.12.3.js`

## 📚 Documentação Oficial

- **Fingerprint.com Subdomain Setup**: https://dev.fingerprint.com/docs/subdomain-integration
- **Cloudflare CNAME Setup**: https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/

## ✅ Configuração Completa!

Quando tudo estiver funcionando:
- ✅ DNS resolve `fp.techandbrew.com.br`
- ✅ Navegador não bloqueia requisições
- ✅ Console mostra coleta de dados bem-sucedida
- ✅ Backend recebe e armazena dados de fingerprint
- ✅ Dashboard de Fingerprint mostra estatísticas

---

**Data de configuração**: 2025-11-09
**Configurado por**: Claude Code
