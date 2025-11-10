# Changelog

Todas as mudanças notáveis do projeto Domino Tech & Brew Dashboard serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [2.1.0] - 2025-11-10

### 🔴 CRÍTICO - Corrigido

#### Cumulative Values Bug (Erro de ~650%)
**Impacto:** Valores da tab Performance estavam inflados em até 650%

**Problema:**
- Relatórios do Slack contêm valores **CUMULATIVOS** (acumulados do dia)
- Código estava **SOMANDO** esses valores, causando duplicação massiva
- Exemplo: Slack mostrava R$ 14.992,68, dashboard mostrava R$ 97.467,83

**Root Causes:**
1. Dados retornados do backend sem ordenação cronológica
2. Código assumia que `array[length-1]` era o mais recente (FALSO!)
3. Filtros de data comparavam strings ("08/11" vs "09/11") alfabeticamente, não cronologicamente
4. Agregação somava múltiplos valores cumulativos do mesmo dia

**Solução:** (commits `e811245`, `abd6c24`)
- Implementada ordenação por timestamp ANTES de todos os filtros
- Criado sistema de agregação que mantém APENAS o último valor de cada dia
- Filtros de período (today, yesterday, last7days) agora usam timestamps reais
- Garantida ordem cronológica em todos os gráficos

**Arquivos Modificados:**
- `src/App.js:879-970` - Timestamp sorting e date-based aggregation

**Resultado:**
- ✅ Valores agora batem 100% com relatórios do Slack
- ✅ Timezone UTC-3 (Brasília) respeitado corretamente
- ✅ "Último Dia Disponível" mostra valor correto: R$ 14.992,68

---

### 🎨 Adicionado

#### Dashboard Reorganization & Tab Isolation
**Impacto:** Completa reestruturação da arquitetura do dashboard

**Problemas Resolvidos:**
1. Tab Overview mostrava dados misturados (Performance + Risco)
2. Filtros eram compartilhados entre todas as tabs causando contaminação
3. Performance ruim com grandes datasets

**Implementação:** (commit `00507ca`)
- Criados computadores de dados isolados com `useMemo`:
  - `performanceFilteredData` → Apenas Performance de Produtos
  - `riscoFilteredData` → Apenas Time de Risco
  - `produtosData` → Breakdown Casino vs Sportsbook
  - `bonusData`, `saldoData`, `usuariosData` → Métricas de risco específicas
- Cada tab agora tem gerenciamento de estado independente
- Filtros aplicam corretamente dentro do escopo de cada tab

**Nova Estrutura de Tabs:**
- **Overview:** Métricas principais com ComposedChart (GGR/NGR/Turnover trends)
- **Performance:** Análise Casino vs Sportsbook com 3 gráficos temporais
- **Risco:** Métricas de gestão de risco (depósitos, saques, bônus, usuários)
- **Anomalias:** Alertas críticos e monitoramento de qualidade de dados

**Arquivos Modificados:**
- `src/App.js:700-1100` - Data isolation logic
- `src/App.js:2200-3800` - Tab rendering structure

---

#### Performance Tab: Time-Series Charts
**Impacto:** Adicionadas visualizações de tendências temporais

**Problema Identificado:**
- User reportou: "a Tag produto não mostra nenhum gráfico, apenas cartões"
- Faltava visualização da evolução temporal dos dados

**Solução:** (commit `e811245`)

Adicionados 3 gráficos interativos:

1. **💰 GGR Trends - LineChart**
   - Evolução do Casino GGR vs Sportsbook GGR
   - Linha dourada (Casino) vs linha roxa (Sportsbook)
   - Pontos marcados em cada valor para clareza

2. **💎 NGR Trends - AreaChart**
   - Casino NGR vs Sportsbook NGR com preenchimento gradiente
   - Gradiente lima (Casino) vs gradiente azul-verde (Sportsbook)
   - Áreas mostram volume melhor que linhas

3. **💸 Turnover Comparison - BarChart**
   - Barras lado a lado para Casino vs Sportsbook
   - Barras ciano (Casino) vs barras azuis (Sportsbook)
   - Comparação visual fácil de volume de apostas

**Recursos:**
- Tooltips com moeda formatada (R$ X.XXX,XX)
- Eixo Y formatado como "R$ Xk" para legibilidade
- Grid e estilo compatíveis com dark mode
- Ordenação cronológica garantida
- Dados de `produtosData.rawData` (último valor por dia)

**Arquivos Modificados:**
- `src/App.js:3790-3970` - Chart implementations

---

### 📝 Modificado

#### Info Badges na Tab Performance
- Alterado "X períodos analisados" → "X dias analisados"
- Adicionado badge "Valores finais de cada dia" para clarificar agregação
- Texto agora reflete corretamente o método de cálculo

**Arquivos Modificados:**
- `src/App.js:3533, 3547` - Info badge text updates

---

### 🛠️ Técnico

#### Melhorias de Performance React
- Todos os computadores de dados usam `useMemo` para evitar recálculos
- Arrays definidos fora de JSX para prevenir React Error #31
- Ordenação otimizada com `.sort()` nativo
- Memoização de gráficos para evitar re-renders desnecessários

#### Timestamp Handling Best Practices
```javascript
// ✅ CORRETO: Sempre ordenar por timestamp
data.sort((a, b) => {
  return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
});

// ❌ ERRADO: Assumir ordem do array
const lastItem = data[data.length - 1]; // Pode não ser o mais recente!
```

#### Cumulative Data Aggregation Pattern
```javascript
// Para dados cumulativos, manter APENAS último valor do dia
const dataByDate = {};
data.forEach(item => {
  if (!dataByDate[item.data] ||
      new Date(item.timestamp) > new Date(dataByDate[item.data].timestamp)) {
    dataByDate[item.data] = item;
  }
});
const lastValuesPerDay = Object.values(dataByDate);
```

---

### 📊 Métricas

**Build Size:**
- Antes: 179.05 kB gzipped
- Depois: 179.12 kB gzipped (+68 B, +0.04%)

**Code Complexity:**
- `src/App.js`: 3,526 → 4,000+ linhas
- Gráficos: 9 tipos → 12 tipos (+3 novos)
- Tabs isoladas: 0 → 4 (100% separação de dados)

**Accuracy:**
- Antes: ~650% erro em valores de Performance
- Depois: 100% match com relatórios do Slack ✅

---

### 🔗 Links Úteis

**Commits Principais:**
- `00507ca` - feat(dashboard): Reorganização completa de tabs
- `e811245` - fix(performance): Correção de cálculos + adição de gráficos
- `abd6c24` - fix(performance): CRÍTICO - Ordenação por timestamp

**Documentação Atualizada:**
- `CLAUDE.md` - Seção "Critical Fixes & Improvements"
- `README.md` - (atualização pendente)

---

## [2.0.0] - 2025-11-09

### 🔒 Adicionado

#### Security: Fingerprint.com Integration
- Integração completa com Fingerprint.com para detecção de fraude
- Device fingerprinting automático no login
- Detecção de VPN/Proxy/Tor/Incognito/Tampering
- Storage persistente em `fingerprintData.json`

**Novos Endpoints:**
- `GET /api/fingerprint/config` - Obter API key de forma segura
- `POST /api/fingerprint` - Salvar dados de fingerprint
- `GET /api/fingerprint/stats` - Estatísticas de fraude
- `GET /api/fingerprint/data` - Todos os registros de fingerprint

**Arquivos Adicionados:**
- `FINGERPRINT-SUBDOMAIN-SETUP.md` - Guia de configuração

#### Security: Bcrypt Password Hashing
- Senhas agora armazenadas como hashes bcrypt (10 salt rounds)
- Senha padrão: `domino2024` (hash em `ADMIN_PASSWORD_HASH`)
- Script utilitário: `backend/utils/generate-password-hash.js`

**Dependências Adicionadas:**
- `bcryptjs@^2.4.3`
- `axios@^1.6.0`

---

## [1.0.0] - 2025-11-01

### 🎉 Lançamento Inicial

#### Features
- Dashboard React 18 com 4 tabs
- Integração com Slack Web API
- Parser para 2 tipos de relatórios:
  - Performance de Produtos (GGR, NGR, Turnover)
  - Time de Risco (Depósitos, Saques, Bônus, Usuários)
- Autenticação JWT básica
- 9 tipos de gráficos (Recharts)
- Dark mode
- Auto-refresh (30s opcional)
- Docker + Docker Compose
- Deploy Vercel (frontend) + CI/CD via GitHub Actions

#### Infrastructure
- Backend: Node.js 18 + Express
- Frontend: React 18 + Nginx
- Database: JSON file-based (`alertas.json`)
- Storage: Docker volumes para persistência

---

## Formato de Versionamento

**MAJOR.MINOR.PATCH**

- **MAJOR:** Mudanças incompatíveis na API
- **MINOR:** Novas funcionalidades (retrocompatível)
- **PATCH:** Correções de bugs (retrocompatível)

**Tipos de Mudanças:**
- `Adicionado` - Novas features
- `Modificado` - Mudanças em features existentes
- `Depreciado` - Features que serão removidas
- `Removido` - Features removidas
- `Corrigido` - Bug fixes
- `Segurança` - Vulnerabilidades corrigidas
