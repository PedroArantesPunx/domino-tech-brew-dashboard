# 📋 Development Guidelines - Dashboard Slack Domino Tech & Brew

> **Versão:** 1.0.0
> **Última Atualização:** 18/10/2025
> **Autor:** Pedro Arantes

---

## 🎯 Objetivo deste Documento

Este documento estabelece as regras, boas práticas e diretrizes para o desenvolvimento e manutenção do Dashboard Slack Domino Tech & Brew. Todas as modificações no projeto devem seguir estas orientações para garantir estabilidade, qualidade e consistência.

---

## ✅ **Operações Permitidas**

### Frontend
- [ ] Adicionar novos componentes React (desde que não quebrem os existentes)
- [ ] Melhorar estilos CSS inline (preservando a estrutura visual atual)
- [ ] Adicionar novos gráficos com Recharts
- [ ] Otimizar performance (memoização, lazy loading)
- [ ] Adicionar funcionalidades de filtro/busca
- [ ] Melhorar responsividade mobile

### Backend
- [ ] Adicionar novos endpoints na API
- [ ] Melhorar parsers de mensagens do Slack
- [ ] Otimizar queries e agregações de dados
- [ ] Adicionar logs detalhados
- [ ] Implementar cache de dados
- [ ] Adicionar validações de entrada

### Infraestrutura
- [ ] Otimizar configurações do Docker
- [ ] Melhorar configurações do Nginx
- [ ] Adicionar health checks
- [ ] Configurar monitoramento
- [ ] Implementar backups automáticos

### Documentação
- [ ] Atualizar README.md
- [ ] Adicionar comentários no código
- [ ] Criar diagramas de arquitetura
- [ ] Documentar endpoints da API
- [ ] Adicionar exemplos de uso

---

## ❌ **Operações Proibidas**

### Crítico - Nunca Fazer
- [ ] ❌ Modificar código sem criar backup primeiro
- [ ] ❌ Remover ou alterar a estrutura dos gráficos sem testar
- [ ] ❌ Alterar timezone sem ajustar todas as referências
- [ ] ❌ Fazer deploy direto em produção sem testes locais
- [ ] ❌ Commitar arquivos `.env` com tokens/secrets
- [ ] ❌ Deletar dados de produção sem backup
- [ ] ❌ Alterar portas padrão (80, 443, 3001) sem documentar
- [ ] ❌ Usar dependências não aprovadas sem análise de segurança

### Frontend Específico
- [ ] ❌ Criar arrays inline complexos no JSX (causa React Error #31)
- [ ] ❌ Remover `useCallback` ou `useMemo` sem entender o impacto
- [ ] ❌ Alterar a estrutura de estados (useState) sem testar
- [ ] ❌ Adicionar bibliotecas pesadas que aumentem bundle size >100KB

### Backend Específico
- [ ] ❌ Alterar a função `aggregateDataByHour()` sem validação
- [ ] ❌ Remover validações de dados do Slack
- [ ] ❌ Expor endpoints sem autenticação (quando implementada)
- [ ] ❌ Fazer requisições ao Slack sem rate limiting

### Dados
- [ ] ❌ Armazenar dados sensíveis em plain text
- [ ] ❌ Modificar manualmente `alertas.json` em produção
- [ ] ❌ Deletar logs de erro sem investigação

---

## ⚠️ **Operações que Requerem Aprovação**

### Mudanças Estruturais
- [ ] ⚠️ Alterar a estrutura de dados retornada pela API
- [ ] ⚠️ Modificar componentes principais (App.js)
- [ ] ⚠️ Trocar bibliotecas de gráficos (Recharts)
- [ ] ⚠️ Alterar configurações de CORS
- [ ] ⚠️ Mudar estratégia de agregação de dados
- [ ] ⚠️ Implementar autenticação/autorização

### Infraestrutura
- [ ] ⚠️ Alterar configurações do Nginx em produção
- [ ] ⚠️ Modificar docker-compose.yml
- [ ] ⚠️ Trocar imagens base do Docker
- [ ] ⚠️ Alterar políticas de restart dos containers
- [ ] ⚠️ Implementar SSL/HTTPS

### Performance
- [ ] ⚠️ Alterar intervalo de auto-refresh (padrão: 30s)
- [ ] ⚠️ Modificar limite de mensagens do Slack (padrão: 100)
- [ ] ⚠️ Alterar período de agregação (padrão: por hora)

---

## 🔒 **Arquivos Críticos** (Backup Obrigatório)

Estes arquivos **NUNCA** devem ser modificados sem criar backup primeiro:

### Frontend
```
src/App.js                              # Componente principal
src/App-working-with-charts-backup.js   # Backup funcional
package.json                            # Dependências
nginx.conf                              # Configuração Nginx
```

### Backend
```
backend/server.js                       # Servidor principal
backend/package.json                    # Dependências
backend/.env                            # Variáveis de ambiente (NÃO COMMITAR)
```

### Docker
```
Dockerfile                              # Build do frontend
backend/Dockerfile                      # Build do backend
docker-compose.yml                      # Orquestração
docker-compose-working-backup.yml       # Backup funcional
```

### Dados
```
backend/alertas.json                    # Dados armazenados
```

### Procedimento de Backup
```bash
# Antes de modificar qualquer arquivo crítico:
cp arquivo.js arquivo-backup-$(date +%Y%m%d-%H%M%S).js

# Para App.js especificamente:
cp src/App.js src/App-backup-$(date +%Y%m%d-%H%M%S).js

# Para dados:
docker cp dashboard-backend:/app/alertas.json ./backup-data-$(date +%Y%m%d).json
```

---

## 🧪 **Testes Obrigatórios**

### Antes de Qualquer Commit

1. **Teste de Build**
   ```bash
   # Frontend
   docker build -t dashboard-frontend-test .

   # Backend
   cd backend && docker build -t dashboard-backend-test .
   ```

2. **Teste de Visualização**
   ```bash
   node test-browser.js
   ```
   - Verificar: ✅ Header, Cards, Gráficos, Tabela
   - Sem erros: ❌ React Error, ❌ Console Errors

3. **Teste de API**
   ```bash
   curl http://localhost/api/dashboard-data | python3 -m json.tool
   ```
   - Status: `200 OK`
   - Dados agregados corretamente
   - Timezone em UTC-3

### Antes de Deploy em Produção

1. **Teste de Containers**
   ```bash
   docker compose up -d
   docker ps  # Verificar se ambos estão UP
   ```

2. **Teste de Health Check**
   ```bash
   curl http://localhost/api/health
   curl http://localhost/
   ```

3. **Teste de Logs**
   ```bash
   docker compose logs --tail 50
   # Verificar: sem erros críticos
   ```

4. **Teste de Dados**
   ```bash
   # Verificar agregação
   curl -s http://localhost/api/dashboard-data | grep "count"

   # Verificar timezone
   curl -s http://localhost/api/dashboard-data | grep "hora"
   ```

---

## 📊 **Padrões de Código**

### React/JavaScript

1. **Sempre usar `useCallback` para funções que são dependências de `useEffect`**
   ```javascript
   const loadData = React.useCallback(async () => {
     // ...
   }, []);
   ```

2. **Usar `useMemo` para cálculos pesados**
   ```javascript
   const chartData = useMemo(() => {
     return data.slice().reverse();
   }, [data]);
   ```

3. **Evitar arrays inline no JSX**
   ```javascript
   // ❌ Errado
   {[{label: 'x', value: 'y'}].map(...)}

   // ✅ Correto
   const items = [{label: 'x', value: 'y'}];
   {items.map(...)}
   ```

4. **Sempre usar key em listas**
   ```javascript
   {data.map((item, idx) => (
     <div key={idx}>...</div>
   ))}
   ```

### Backend/Node.js

1. **Sempre usar timezone de Brasília**
   ```javascript
   const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
   ```

2. **Validar dados do Slack antes de processar**
   ```javascript
   if (!text || !text.includes('Relatório')) {
     return null;
   }
   ```

3. **Usar try/catch em operações assíncronas**
   ```javascript
   try {
     await fs.readFile(DATA_FILE);
   } catch (error) {
     console.error('Erro:', error);
   }
   ```

4. **Adicionar logs descritivos**
   ```javascript
   console.log('✅ Dados salvos com sucesso');
   console.error('❌ Erro ao buscar mensagens:', error);
   ```

---

## 🔄 **Workflow de Desenvolvimento**

### 1. Planejamento
- [ ] Definir objetivo da mudança
- [ ] Verificar se não quebra funcionalidades existentes
- [ ] Consultar este documento de guidelines

### 2. Implementação
- [ ] Criar branch (se usando git)
- [ ] Fazer backup de arquivos críticos
- [ ] Implementar mudanças incrementalmente
- [ ] Adicionar comentários no código

### 3. Testes
- [ ] Executar `test-browser.js`
- [ ] Testar manualmente no navegador
- [ ] Verificar logs do Docker
- [ ] Validar API com curl

### 4. Documentação
- [ ] Atualizar README se necessário
- [ ] Adicionar comentários no código
- [ ] Atualizar este documento se criar novas regras

### 5. Deploy
- [ ] Fazer backup do estado atual
- [ ] Rebuild containers
- [ ] Testar em staging (se disponível)
- [ ] Deploy em produção
- [ ] Monitorar logs por 10 minutos

---

## 🚨 **Em Caso de Erro**

### Dashboard com Tela Branca

1. **Verificar console do navegador** (F12)
2. **Executar `test-browser.js`** para capturar erros
3. **Verificar se há React Error #31** (objetos inline no JSX)
4. **Restaurar do backup**:
   ```bash
   cp src/App-working-with-charts-backup.js src/App.js
   docker build -t dashboard-frontend .
   docker restart dashboard-frontend
   ```

### API Retornando Erro 500

1. **Verificar logs do backend**:
   ```bash
   docker logs dashboard-backend --tail 100
   ```
2. **Testar endpoint diretamente**:
   ```bash
   curl -v http://localhost:3001/api/dashboard-data
   ```
3. **Verificar `.env` está configurado**
4. **Restaurar do backup se necessário**

### Containers Não Iniciam

1. **Verificar logs**:
   ```bash
   docker compose logs
   ```
2. **Verificar portas em uso**:
   ```bash
   netstat -tulpn | grep -E '80|443|3001'
   ```
3. **Rebuild forçado**:
   ```bash
   docker compose down
   docker compose build --no-cache
   docker compose up -d
   ```

---

## 📝 **Versionamento**

### Commits Git (Quando implementado)

Padrão de mensagens:
```
tipo(escopo): descrição

Exemplos:
feat(frontend): Adicionar filtro por tipo de relatório
fix(backend): Corrigir timezone para UTC-3
docs(readme): Atualizar instruções de deploy
refactor(api): Otimizar agregação de dados
test(browser): Adicionar teste de gráficos
```

Tipos:
- `feat`: Nova funcionalidade
- `fix`: Correção de bug
- `docs`: Documentação
- `refactor`: Refatoração
- `test`: Testes
- `chore`: Tarefas de manutenção

---

## 🔐 **Segurança**

### Dados Sensíveis
- [ ] **NUNCA** commitar `.env` com tokens reais
- [ ] Usar `.env.example` para templates
- [ ] Rotacionar tokens periodicamente
- [ ] Limitar permissões do Slack ao mínimo necessário

### API
- [ ] Validar todas as entradas
- [ ] Sanitizar dados antes de processar
- [ ] Implementar rate limiting
- [ ] Adicionar logs de acesso

### Docker
- [ ] Usar imagens oficiais e verificadas
- [ ] Manter imagens atualizadas
- [ ] Não usar `latest` em produção
- [ ] Limitar recursos dos containers

---

## 📞 **Contatos e Responsáveis**

- **Desenvolvedor Principal**: Pedro Arantes
- **GitHub**: [@PedroArantesPunx](https://github.com/PedroArantesPunx)
- **Docker Hub**: [pedropunx](https://hub.docker.com/u/pedropunx)

---

## 📚 **Recursos e Referências**

### Documentação Oficial
- [React Hooks](https://react.dev/reference/react)
- [Recharts](https://recharts.org/en-US/)
- [Slack API](https://api.slack.com/docs)
- [Docker](https://docs.docker.com/)
- [Nginx](https://nginx.org/en/docs/)

### Scripts Úteis
- `test-browser.js` - Teste automatizado com Puppeteer
- `test-api.js` - Teste de validação da API

---

## ✅ **Checklist de Revisão**

Antes de considerar uma mudança completa, verificar:

- [ ] Código testado localmente
- [ ] Backup dos arquivos modificados criado
- [ ] `test-browser.js` executado com sucesso
- [ ] Dashboard visível e funcional no navegador
- [ ] Gráficos renderizando corretamente
- [ ] API retornando dados agregados
- [ ] Timezone correto (UTC-3)
- [ ] Sem erros no console do navegador
- [ ] Sem erros nos logs do Docker
- [ ] Documentação atualizada (se aplicável)
- [ ] Guidelines seguidas

---

## 🔄 **Histórico de Mudanças**

### v1.0.0 - 18/10/2025
- ✅ Criação do documento
- ✅ Definição de regras básicas
- ✅ Estabelecimento de workflow
- ✅ Documentação de arquivos críticos
- ✅ Procedimentos de backup e restore

---

> **Nota**: Este documento é vivo e deve ser atualizado sempre que novas regras ou práticas forem estabelecidas. Toda modificação neste documento deve ser discutida e aprovada.

**Última revisão**: 18/10/2025, 13:15 BRT
