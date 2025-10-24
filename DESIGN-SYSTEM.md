# 🎨 Design System - Dashboard v5.0 Pro

## Inspirações
- **Grafana** - KPI Panels, Time Series, Layout
- **Tableau** - Gauge Charts, Tooltips
- **Power BI** - Color Palette, Cards
- **Material Design** - Spacing, Typography

---

## 📊 Visualizações por Tipo de Dado

### 1. **Métricas Financeiras (GGR, NGR)**
**Gráfico:** Area Chart com Gradiente
- **Por quê:** Visualiza tendências e volume ao longo do tempo
- **Features:** Gradiente azul/verde, brush para zoom, tooltips ricos
- **Componente:** `<ComposedChart>` + `<Area>` + `<Line>`

```jsx
<Area
  type="monotone"
  dataKey="GGR"
  fill="url(#colorGGR)"  // Gradiente
  stroke={colors.primary}
  strokeWidth={3}
/>
```

### 2. **Percentuais (Margem, Conversão)**
**Gráfico:** Gauge Chart Semicircular
- **Por quê:** Visualização intuitiva de metas e percentuais
- **Features:** RadialBar, valor centralizado, indicação de % do máximo
- **Componente:** `<RadialBarChart>`

### 3. **Comparação (Cassino vs Sportsbook)**
**Gráfico:** Donut Chart
- **Por quê:** Comparação clara de proporções
- **Features:** Inner radius 80%, labels com percentual
- **Cores:** Purple (#8b5cf6) vs Green (#10b981)

### 4. **KPIs Principais**
**Gráfico:** Stat Panel com Sparkline
- **Por quê:** Número grande + contexto histórico
- **Features:**
  - Valor em destaque (32px bold)
  - Mini gráfico de tendência (últimos 10 pontos)
  - Indicador de variação colorido
  - Hover effect

```jsx
<StatCard
  title="💰 GGR Médio"
  value="R$ 405"
  trend={128.4}
  sparklineData={[...]}
  icon="📈"
/>
```

### 5. **Fluxo Financeiro (Depósitos vs Saques)**
**Gráfico:** Bar Chart com Bordas Arredondadas
- **Por quê:** Comparação direta de valores opostos
- **Features:** `radius={[8, 8, 0, 0]}`, cores semânticas
- **Cores:** Green (depósitos) vs Red (saques)

---

## 🎨 Paleta de Cores

### Cores Primárias
```css
Primary (Blue):   #3b82f6  /* Ações principais, links */
Success (Green):  #10b981  /* Valores positivos, sucesso */
Warning (Orange): #f59e0b  /* Alertas, neutro */
Danger (Red):     #ef4444  /* Valores negativos, erro */
Purple:           #8b5cf6  /* Produtos, destaque */
Cyan:             #06b6d4  /* Informação */
```

### Gradientes
```css
Blue Gradient:   linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)
Green Gradient:  linear-gradient(to bottom, #10b981 0%, transparent 100%)
Purple Gradient: linear-gradient(to bottom, #8b5cf6 0%, transparent 100%)
```

### Backgrounds
```css
/* Light Mode */
Background: #f3f4f6
Card:       #ffffff
Card Hover: #f9fafb

/* Dark Mode */
Background: #111827
Card:       #374151
Card Hover: #1f2937
```

### Texto
```css
Primary:   #1f2937  (dark mode: #ffffff)
Secondary: #6b7280
Light:     #9ca3af
```

---

## 📐 Layout & Grid

### Responsivo (Mobile-First)
```css
/* Auto-fit Grid */
display: grid;
grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
gap: 20px;

/* Breakpoints */
Mobile:  < 640px  (1 coluna)
Tablet:  640-1024px  (2 colunas)
Desktop: > 1024px  (3-4 colunas)
```

### Espaçamento
- **Small:** 8px, 12px
- **Medium:** 16px, 20px, 24px
- **Large:** 32px, 48px
- **Container:** Max-width 1600px

### Bordas
- **Radius:** 8px (small), 12px (cards)
- **Shadows:** `0 2px 8px rgba(0,0,0,0.08)`
- **Borders:** 1px solid #e5e7eb

---

## ✨ Componentes

### 1. StatCard (KPI Card)
**Anatomia:**
```
┌─────────────────────────────┐
│ TITLE               ICON    │
│                             │
│ VALUE UNIT                  │
│ ↗️ TREND% vs anterior       │
│ ━━━━━━━━━━━━━━━━━━━━━━━━ │ (sparkline)
└─────────────────────────────┘
```

**Props:**
- `title` - Título em uppercase
- `value` - Valor principal (grande)
- `trend` - % de variação
- `sparklineData` - Array de valores históricos
- `unit` - Unidade (%, R$, etc)
- `icon` - Emoji decorativo

### 2. GaugeChart
**Anatomia:**
```
     ┌─────────────┐
     │    TITLE    │
     │             │
     │    ╱───╲    │
     │   │ VAL │   │
     │    ╲───╱    │
     │  XX% máximo │
     └─────────────┘
```

**Props:**
- `value` - Valor atual
- `max` - Valor máximo
- `title` - Título do medidor
- `color` - Cor do gauge

### 3. FilterCard
**Features:**
- Labels uppercase com letter-spacing
- Select estilizado
- Border colorida no hover
- Dark mode support

---

## 🎭 Animações & Interações

### Hover Effects
```css
/* Cards */
transition: transform 0.3s ease;
transform: translateY(-2px);
box-shadow: 0 4px 12px rgba(0,0,0,0.12);

/* Buttons */
transition: background-color 0.2s;
background: rgba(255,255,255,0.3);
backdrop-filter: blur(10px);
```

### Loading States
```jsx
<div style={{ textAlign: 'center', padding: '80px' }}>
  <div style={{ fontSize: '48px' }}>⏳</div>
  <div>Carregando dados...</div>
</div>
```

### Empty States
```jsx
<div style={{ textAlign: 'center', padding: '80px' }}>
  <div style={{ fontSize: '64px' }}>📊</div>
  <div>Nenhum dado disponível</div>
</div>
```

---

## 🌓 Dark Mode

### Toggle
```jsx
<button onClick={() => setDarkMode(!darkMode)}>
  {darkMode ? '☀️' : '🌙'}
</button>
```

### Implementação
```jsx
const bgColor = darkMode ? '#111827' : '#f3f4f6';
const cardBg = darkMode ? '#374151' : '#ffffff';
const textColor = darkMode ? '#ffffff' : '#1f2937';
```

---

## 📱 Responsividade

### Testes Realizados
- ✅ Desktop 1920x1080
- ✅ Laptop 1366x768
- ✅ Tablet 768x1024
- ✅ Mobile 375x667

### Técnicas
1. **Grid Auto-fit:** Adapta colunas automaticamente
2. **Flexbox:** Para header e cards internos
3. **Min-width:** Garante legibilidade
4. **Relative Units:** rem, %, vh/vw
5. **Media Queries:** Ajustes finos se necessário

---

## 🎯 Métricas de Performance

### Build
- **Size (gzipped):** 161.72 KB
- **Aumento:** +4.7 KB vs v4.1
- **Razão:** Novos componentes (Gauge, Sparkline)

### Otimizações
- ✅ `useMemo` para cálculos pesados
- ✅ `useCallback` para funções
- ✅ Lazy loading de gráficos (Recharts)
- ✅ CSS-in-JS (zero CSS externo)

---

## 📚 Referências

### Bibliotecas
- **Recharts** 2.8.0 - Gráficos React
- **React** 18.2.0 - Framework
- **Lucide React** 0.263.1 - Ícones (não usado ainda)

### Inspirações Visuais
1. **Grafana** - https://grafana.com/
   - Stat panels
   - Time series
   - Dark mode

2. **Tableau** - https://www.tableau.com/
   - Gauge charts
   - Color palette
   - Tooltips

3. **Power BI** - https://powerbi.microsoft.com/
   - Card layouts
   - KPI design
   - Filters

4. **Material Design** - https://material.io/
   - Typography scale
   - Spacing system
   - Elevation (shadows)

---

## 🚀 Próximas Melhorias (Futuro)

### v5.1 - Interatividade Avançada
- [ ] Drill-down em gráficos (click para detalhes)
- [ ] Cross-filtering (filtro entre gráficos)
- [ ] Annotations nos gráficos
- [ ] Export individual de gráficos (PNG)

### v5.2 - Análises Avançadas
- [ ] Heatmap de padrões por hora
- [ ] Funnel chart de conversão
- [ ] Candlestick para volatilidade
- [ ] Scatter plot de correlações

### v5.3 - Personalização
- [ ] Salvar layout personalizado
- [ ] Criar dashboards customizados
- [ ] Temas de cores (preset themes)
- [ ] Widgets drag-and-drop

### v5.4 - Alertas & Notificações
- [ ] Threshold alerts (quando GGR < X)
- [ ] Push notifications
- [ ] Email reports
- [ ] Slack integration (bidirectional)

---

**Versão:** 5.0 Pro
**Data:** 24/10/2025
**Autor:** Claude Code + Pedro
