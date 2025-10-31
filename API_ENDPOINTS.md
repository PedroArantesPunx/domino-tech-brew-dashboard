# 📋 API ENDPOINTS - Backend Domino Tech & Brew

**Base URL:** `http://localhost:3001`

## ✅ TODOS OS ENDPOINTS (Status: Testado e Funcionando)

### 🏥 Sistema e Monitoramento

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/health` | GET | Health check do servidor | ✅ 200 |
| `/api/coverage-analysis` | GET | **NOVO** - Análise de cobertura horária dos disparos | ✅ 200 |
| `/api/quality-report` | GET | Relatório de qualidade dos dados | ✅ 200 |
| `/api/data-quality` | GET | Métricas de qualidade dos dados | ✅ 200 |

### 📊 Dashboards

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/dashboard-performance` | GET | Dashboard Performance de Produtos (Casino + Sportsbook) | ✅ 200 |
| `/api/dashboard-risco` | GET | Dashboard Time de Risco (jogadores, depósitos, saques) | ✅ 200 |
| `/api/dashboard-overview` | GET | Dashboard Overview Geral (visão executiva) | ✅ 200 |
| `/api/dashboard-data` | GET | Dashboard completo (legado - não separado por tipo) | ✅ 200 |

### 🚨 Análises e Alertas

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/anomalies` | GET | Detecção de anomalias nos dados | ✅ 200 |
| `/api/deltas` | GET | Diferenças entre períodos consecutivos | ✅ 200 |

### 💾 Dados e Slack

| Endpoint | Método | Descrição | Status |
|----------|--------|-----------|--------|
| `/api/data` | GET | Retorna todos os dados brutos armazenados | ✅ 200 |
| `/api/data` | DELETE | **⚠️ CUIDADO** - Deleta todos os dados | ⚠️ Destrutivo |
| `/api/list-channels` | GET | Lista canais do Slack disponíveis | ✅ 200 |
| `/api/fetch-messages` | GET | **IMPORTANTE** - Busca mensagens manualmente do Slack | ✅ 200 |
| `/api/debug-messages` | GET | Debug das mensagens do Slack | ✅ 200 |
| `/api/test-parser` | POST | Testa o parser de mensagens | ⚠️ Requer body |

---

## 🔧 ENDPOINTS IMPORTANTES PARA OPERAÇÃO

### 1. `/api/fetch-messages` - Busca Manual de Mensagens

Busca mensagens do Slack imediatamente (útil para recuperação de dados).

**Uso básico:**
```bash
curl http://localhost:3001/api/fetch-messages
```

**Com parâmetros:**
```bash
# Buscar dos últimos 7 dias
curl "http://localhost:3001/api/fetch-messages?days=7"

# Buscar dos últimos 30 dias
curl "http://localhost:3001/api/fetch-messages?days=30"
```

**Resposta:**
```json
{
  "success": true,
  "totalMessages": 150,
  "processedReports": 120,
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

---

### 2. `/api/coverage-analysis` - Análise de Cobertura (NOVO)

Verifica quais horários estão faltando dados.

**Uso:**
```bash
curl http://localhost:3001/api/coverage-analysis | python3 -m json.tool
```

**Resposta:**
```json
{
  "success": true,
  "performance": {
    "coverage": {
      "30/10": {
        "totalDisparos": 75,
        "expectedDisparos": 96,
        "missingHours": ["19", "20", "21", "22", "23"],
        "coverage": 78.125,
        "isComplete": false
      }
    },
    "stats": {
      "totalDays": 17,
      "completeDays": 0,
      "averageCoverage": 74.6
    }
  },
  "risco": { ... }
}
```

---

### 3. `/api/health` - Health Check

Verifica se o servidor está online.

**Uso:**
```bash
curl http://localhost:3001/api/health
```

**Resposta:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-31T00:00:00.000Z"
}
```

**Útil para:**
- Monitoramento automático
- Scripts de verificação
- Serviços externos (UptimeRobot, Pingdom)

---

### 4. `/api/dashboard-performance` - Dashboard Performance

Retorna dados agregados de Performance de Produtos.

**Uso:**
```bash
curl "http://localhost:3001/api/dashboard-performance?days=7" | python3 -m json.tool
```

**Parâmetros:**
- `days`: Número de dias para buscar (padrão: 30)
- `startDate`: Data inicial (formato: DD/MM/YYYY)
- `endDate`: Data final (formato: DD/MM/YYYY)

**Resposta:**
```json
{
  "success": true,
  "data": [...],
  "count": 672,
  "stats": {
    "totals": {
      "cassinoGGR": 15234.56,
      "cassinoNGR": 14567.89,
      "sportsbookGGR": 1234.56,
      "sportsbookNGR": 1123.45
    },
    "diff": {
      "casino": {
        "ggr": 123.45,
        "ngr": 115.67
      },
      "sportsbook": {
        "ggr": 45.67,
        "ngr": 42.34
      }
    }
  }
}
```

---

### 5. `/api/dashboard-risco` - Dashboard Time de Risco

Retorna dados agregados de Time de Risco.

**Uso:**
```bash
curl "http://localhost:3001/api/dashboard-risco?days=7" | python3 -m json.tool
```

**Parâmetros:**
- `days`: Número de dias para buscar (padrão: 30)

**Resposta:**
```json
{
  "success": true,
  "data": [...],
  "count": 168,
  "stats": {
    "totals": {
      "ggr": 45678.90,
      "ngr": 43210.12,
      "depositos": 12345.67,
      "saques": 9876.54,
      "fluxoLiquido": 2469.13
    },
    "diff": {
      "ggr": 234.56,
      "ngr": 223.45,
      "depositos": 156.78,
      "saques": -89.12,
      "fluxoLiquido": 245.90
    }
  }
}
```

---

### 6. `/api/anomalies` - Detecção de Anomalias

Detecta valores anormais nos dados.

**Uso:**
```bash
curl http://localhost:3001/api/anomalies | python3 -m json.tool
```

**Resposta:**
```json
{
  "success": true,
  "anomalies": [
    {
      "date": "30/10",
      "hour": "14:00",
      "metric": "ggr",
      "value": 5234.56,
      "avgValue": 1234.56,
      "deviation": 3.5,
      "severity": "high"
    }
  ],
  "totalAnomalies": 15
}
```

---

### 7. `/api/data` - Dados Brutos

Retorna todos os dados armazenados sem processamento.

**Uso:**
```bash
curl http://localhost:3001/api/data | python3 -m json.tool | head -100
```

**Útil para:**
- Debug
- Export de dados
- Análises customizadas

**⚠️ ATENÇÃO:** Pode retornar arquivos muito grandes (33.501 registros atualmente).

---

## 📊 EXEMPLOS DE USO PRÁTICO

### Verificar status do sistema:
```bash
curl http://localhost:3001/api/health && echo " - OK"
```

### Buscar dados dos últimos 7 dias:
```bash
curl "http://localhost:3001/api/dashboard-performance?days=7" -o performance-7dias.json
curl "http://localhost:3001/api/dashboard-risco?days=7" -o risco-7dias.json
```

### Verificar cobertura e encontrar lacunas:
```bash
curl http://localhost:3001/api/coverage-analysis | \
  python3 -c "import sys,json; d=json.load(sys.stdin); \
  [print(f'{k}: {v[\"coverage\"]:.1f}%') for k,v in sorted(d['performance']['coverage'].items(), reverse=True)[:5]]"
```

### Buscar mensagens manualmente para recuperar dados:
```bash
curl "http://localhost:3001/api/fetch-messages?days=30"
```

### Ver logs do servidor:
```bash
docker logs --tail 100 dashboard-backend
```

---

## 🔒 SEGURANÇA

**Endpoints destrutivos:**
- `DELETE /api/data` - Deleta TODOS os dados (use com cuidado!)

**Recomendações:**
- Não expor publicamente (manter apenas localhost)
- Se expor, usar autenticação/token
- Fazer backup regular dos dados

---

## 📝 NOTAS

1. Todos os endpoints estão funcionando (testados em 2025-10-31)
2. Cobertura atual: ~74-76% (devido a restart policy = 'no')
3. Após configurar restart policy, cobertura deve melhorar significativamente
4. Logs do Docker estão acessíveis via `docker logs dashboard-backend`
