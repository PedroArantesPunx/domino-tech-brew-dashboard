# 🔧 SOLUÇÕES PARA PROBLEMA DE DOWNTIME E PERDA DE DADOS

## 🔍 PROBLEMA IDENTIFICADO

**Restart Policy = `no`** → Container NÃO reinicia automaticamente quando cai por erro!

**Impacto:**
- Servidor Node.js trava por erro → Container para completamente
- Fica parado até restart manual
- Perde ciclos de busca automática do Slack (a cada 1 hora)
- **Resultado:** Cobertura de apenas 74-76% dos dados esperados

---

## ✅ SOLUÇÃO 1: Configurar Restart Policy (CRÍTICO - IMPLEMENTAR AGORA)

### Opção A: Atualizar container existente (Mais Rápido)
```bash
docker update --restart=unless-stopped dashboard-backend
```

### Opção B: Recriar container com restart policy (Recomendado)
```bash
docker stop dashboard-backend
docker rm dashboard-backend

docker run -d \
  --name dashboard-backend \
  --restart=unless-stopped \
  -p 3001:3001 \
  -e SLACK_BOT_TOKEN=seu_token_aqui \
  -e CHANNEL_ID=seu_channel_id_aqui \
  -e PORT=3001 \
  -e NODE_ENV=production \
  pedropunx/domino-tech-backend:latest
```

**Diferença entre políticas:**
- `always`: Sempre reinicia (mesmo após reboot do servidor)
- `unless-stopped`: Reinicia automaticamente, exceto se você parou manualmente ✅ **RECOMENDADO**
- `on-failure`: Reinicia apenas em caso de erro (bom para debug)

---

## ✅ SOLUÇÃO 2: Acessar Logs do Docker

Você TEM acesso aos logs do Docker! Use estes comandos:

### Ver logs em tempo real:
```bash
docker logs -f dashboard-backend
```

### Ver últimas 100 linhas:
```bash
docker logs --tail 100 dashboard-backend
```

### Ver logs com timestamps:
```bash
docker logs -f --timestamps dashboard-backend
```

### Buscar erros nos logs:
```bash
docker logs dashboard-backend 2>&1 | grep -i "error\|exception\|crash"
```

### Salvar logs em arquivo para análise:
```bash
docker logs dashboard-backend > ~/logs-backend-$(date +%Y%m%d-%H%M%S).txt
```

---

## ✅ SOLUÇÃO 3: Logging Persistente em Arquivo

Criar volume para salvar logs permanentemente (mesmo após container ser deletado).

### A. Criar diretório de logs:
```bash
mkdir -p /home/pedro/Documentos/domino_techandbrew/logs
```

### B. Recriar container com volume de logs:
```bash
docker stop dashboard-backend
docker rm dashboard-backend

docker run -d \
  --name dashboard-backend \
  --restart=unless-stopped \
  -p 3001:3001 \
  -v /home/pedro/Documentos/domino_techandbrew/logs:/app/logs \
  -e SLACK_BOT_TOKEN=seu_token_aqui \
  -e CHANNEL_ID=seu_channel_id_aqui \
  -e PORT=3001 \
  -e NODE_ENV=production \
  pedropunx/domino-tech-backend:latest
```

### C. Ler logs posteriormente:
```bash
# Ver últimas 100 linhas do log
tail -100 /home/pedro/Documentos/domino_techandbrew/logs/server.log

# Ver erros
grep "ERROR\|Error\|error" /home/pedro/Documentos/domino_techandbrew/logs/server.log

# Monitorar em tempo real
tail -f /home/pedro/Documentos/domino_techandbrew/logs/server.log
```

**Nota:** Requer modificação no código do server.js para escrever logs em arquivo (posso implementar).

---

## ✅ SOLUÇÃO 4: Script de Monitoramento Externo

Criar script que monitora se o servidor está online e registra quando cai.

### A. Criar script de monitoramento:
```bash
cat > /home/pedro/Documentos/domino_techandbrew/monitor.sh << 'EOF'
#!/bin/bash

LOG_FILE="/home/pedro/Documentos/domino_techandbrew/logs/monitor.log"
mkdir -p "$(dirname "$LOG_FILE")"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# Verificar se servidor está respondendo
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

if [ "$HTTP_CODE" != "200" ]; then
    echo "[$TIMESTAMP] ❌ SERVIDOR OFFLINE - HTTP $HTTP_CODE" >> "$LOG_FILE"

    # Verificar se container está rodando
    if ! docker ps | grep -q dashboard-backend; then
        echo "[$TIMESTAMP] 🔴 CONTAINER PARADO - Tentando reiniciar..." >> "$LOG_FILE"
        docker start dashboard-backend
        echo "[$TIMESTAMP] ✅ Container reiniciado" >> "$LOG_FILE"
    fi

    # Salvar logs do Docker
    docker logs --tail 50 dashboard-backend >> "$LOG_FILE" 2>&1
else
    echo "[$TIMESTAMP] ✅ Servidor OK" >> "$LOG_FILE"
fi
EOF

chmod +x /home/pedro/Documentos/domino_techandbrew/monitor.sh
```

### B. Testar script manualmente:
```bash
/home/pedro/Documentos/domino_techandbrew/monitor.sh
cat /home/pedro/Documentos/domino_techandbrew/logs/monitor.log
```

### C. Agendar execução a cada 5 minutos (crontab):
```bash
# Editar crontab
crontab -e

# Adicionar linha (executar a cada 5 minutos):
*/5 * * * * /home/pedro/Documentos/domino_techandbrew/monitor.sh
```

### D. Ver agenda do crontab:
```bash
crontab -l
```

---

## ✅ SOLUÇÃO 5: Melhorias no Código (Tratamento de Erros)

Implementar tratamento robusto de erros no server.js para evitar crashes:

- Capturar exceções não tratadas
- Capturar promessas rejeitadas
- Adicionar try/catch em operações críticas
- Logar erros em arquivo
- Continuar operando mesmo com erros pontuais

**Posso implementar estas melhorias agora se você quiser.**

---

## ✅ SOLUÇÃO 6: Busca Manual de Dados Faltantes

Você pode usar o endpoint `/api/fetch-messages` para buscar mensagens do Slack e preencher lacunas:

### Buscar mensagens recentes:
```bash
# Buscar mensagens dos últimos 7 dias
curl "http://localhost:3001/api/fetch-messages?days=7"

# Buscar mensagens dos últimos 30 dias
curl "http://localhost:3001/api/fetch-messages?days=30"
```

### Ver quantas mensagens foram processadas:
```bash
curl "http://localhost:3001/api/fetch-messages?days=7" | python3 -m json.tool
```

**Nota:** A API do Slack tem limite de mensagens retornadas (geralmente 100-1000), então pode não recuperar 100% dos dados antigos.

---

## ✅ SOLUÇÃO 7: Health Check Endpoint para Monitoramento

Já implementado! Use o endpoint `/api/health` para verificar status:

```bash
# Verificar se servidor está online
curl http://localhost:3001/api/health

# Resposta esperada:
# {"status":"ok","timestamp":"2025-10-31T00:00:00.000Z"}
```

Você pode usar serviços de monitoramento externos (UptimeRobot, Pingdom, etc.) para monitorar este endpoint gratuitamente.

---

## 📊 PRIORIDADE DE IMPLEMENTAÇÃO

### 🔥 URGENTE (Fazer AGORA):
1. **Solução 1** - Configurar restart policy
   ```bash
   docker update --restart=unless-stopped dashboard-backend
   ```

### ⚠️ IMPORTANTE (Fazer em seguida):
2. **Solução 2** - Verificar logs do Docker para entender erros
   ```bash
   docker logs --tail 200 dashboard-backend | grep -i error
   ```

3. **Solução 5** - Melhorias no código (tratamento de erros)

### 📋 RECOMENDADO (Implementar esta semana):
4. **Solução 4** - Script de monitoramento com crontab
5. **Solução 3** - Logging persistente em arquivo

### 💡 OPCIONAL:
6. **Solução 6** - Buscar dados faltantes manualmente
7. **Solução 7** - Configurar monitoramento externo

---

## 🎯 RESULTADO ESPERADO

Com estas soluções implementadas:
- ✅ Container reinicia automaticamente em caso de erro
- ✅ Logs acessíveis via Docker ou arquivo
- ✅ Monitoramento detecta e registra downtimes
- ✅ Código mais robusto com melhor tratamento de erros
- ✅ **Cobertura deve subir de 74-76% para próximo de 100%**

---

## 🚀 COMANDO RÁPIDO - IMPLEMENTAR AGORA

Execute este comando único para implementar a Solução 1 (restart policy):

```bash
docker update --restart=unless-stopped dashboard-backend && \
echo "✅ Restart policy atualizado!" && \
docker inspect dashboard-backend | grep -A 2 RestartPolicy
```

Depois verifique os logs para identificar erros recorrentes:

```bash
docker logs --tail 200 dashboard-backend 2>&1 | grep -i "error\|exception\|crash" | tail -20
```
