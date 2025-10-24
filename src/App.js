import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Brush } from 'recharts';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [stats, setStats] = useState({
    totalAlertas: 0,
    alertasHoje: 0,
    ultimoAlerta: null
  });

  // ==== NOVOS FILTROS INTERATIVOS ====
  const [periodFilter, setPeriodFilter] = useState('all'); // 'all', 'last20', 'last50', 'today'
  const [tipoFilter, setTipoFilter] = useState('all'); // 'all', 'performance', 'risco'
  const [showBrush, setShowBrush] = useState(true); // Controle de zoom/pan

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dashboard-data');
      if (!response.ok) {
        throw new Error('Erro ao conectar com o backend');
      }
      const result = await response.json();
      setData(result.data || []);
      setStats(result.stats || {});
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadData]);

  // ==== DADOS FILTRADOS POR PERÍODO E TIPO ====
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = [...data];

    // Filtro por tipo
    if (tipoFilter === 'performance') {
      filtered = filtered.filter(item => item.tipoRelatorio === 'Performance de Produtos');
    } else if (tipoFilter === 'risco') {
      filtered = filtered.filter(item => item.tipoRelatorio === 'Time de Risco');
    }

    // Filtro por período
    if (periodFilter === 'today') {
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      filtered = filtered.filter(item => item.data === today);
    } else if (periodFilter === 'last20') {
      filtered = filtered.slice(-20);
    } else if (periodFilter === 'last50') {
      filtered = filtered.slice(-50);
    }
    // 'all' já retorna tudo

    return filtered;
  }, [data, periodFilter, tipoFilter]);

  // ===== MÉTRICAS CALCULADAS (baseadas em dados filtrados) =====
  const metrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const validData = filteredData.filter(item => item.ggr && item.ngr);
    if (validData.length === 0) return null;

    const avgGGR = validData.reduce((sum, item) => sum + item.ggr, 0) / validData.length;
    const avgNGR = validData.reduce((sum, item) => sum + item.ngr, 0) / validData.length;
    const margin = avgNGR / avgGGR;
    const conversion = validData[0].turnoverTotal ? avgNGR / validData[0].turnoverTotal : 0;

    // Calcular volatilidade (desvio padrão)
    const variance = validData.reduce((sum, item) => sum + Math.pow(item.ggr - avgGGR, 2), 0) / validData.length;
    const volatility = Math.sqrt(variance);

    // Tendências (comparar últimos 2 períodos)
    let ggrTrend = 0;
    let marginTrend = 0;
    if (validData.length >= 2) {
      const current = validData[validData.length - 1];
      const previous = validData[validData.length - 2];
      ggrTrend = ((current.ggr - previous.ggr) / previous.ggr) * 100;
      const currentMargin = current.ngr / current.ggr;
      const previousMargin = previous.ngr / previous.ggr;
      marginTrend = ((currentMargin - previousMargin) / previousMargin) * 100;
    }

    return {
      avgGGR,
      avgNGR,
      margin: margin * 100,
      conversion: conversion * 100,
      volatility,
      ggrTrend,
      marginTrend
    };
  }, [filteredData]);

  // ===== COMPARAÇÃO CASSINO VS SPORTSBOOK =====
  const produtosData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const perfData = filteredData.filter(item => item.tipoRelatorio === 'Performance de Produtos' && item.cassinoGGR && item.sportsbookGGR);
    if (perfData.length === 0) return null;

    const latest = perfData[perfData.length - 1];

    return {
      pie: [
        { name: 'Cassino', value: latest.cassinoGGR || 0, color: '#8b5cf6' },
        { name: 'Sportsbook', value: latest.sportsbookGGR || 0, color: '#10b981' }
      ],
      cassinoPercent: ((latest.cassinoGGR / (latest.cassinoGGR + latest.sportsbookGGR)) * 100).toFixed(1),
      sportsPercent: ((latest.sportsbookGGR / (latest.cassinoGGR + latest.sportsbookGGR)) * 100).toFixed(1)
    };
  }, [filteredData]);

  // ===== DADOS DE BÔNUS E COMPORTAMENTO =====
  const bonusComportamentoData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;

    const riscoData = filteredData.filter(item => item.tipoRelatorio === 'Time de Risco');
    if (riscoData.length === 0) return null;

    const latest = riscoData[riscoData.length - 1];

    // Verificar se há ALGUM campo de bônus ou comportamento
    const hasData = latest.bonusConcedidos || latest.saldoInicial || latest.depositoMedio || latest.ticketMedio;

    const roi = latest.bonusConcedidos > 0 && latest.ggr ? (latest.ggr / latest.bonusConcedidos) * 100 : 0;

    return {
      // Bônus e Promoções (5 campos)
      bonus: {
        concedidos: latest.bonusConcedidos || null,
        convertidos: latest.bonusConvertidos || null,
        taxaConversao: latest.taxaConversaoBonus || null,
        apostasComBonus: latest.apostasComBonus || null,
        custoBonus: latest.custoBonus || null,
        roi: roi
      },
      // Saldo e Variação (3 campos)
      saldo: {
        inicial: latest.saldoInicial || null,
        final: latest.saldoFinal || null,
        variacao: latest.variacaoSaldo || null
      },
      // Comportamento Financeiro (5 campos)
      comportamento: {
        depositoMedio: latest.depositoMedio || null,
        numeroMedioDepositos: latest.numeroMedioDepositos || null,
        saqueMedio: latest.saqueMedio || null,
        ticketMedio: latest.ticketMedio || null,
        ggrMedioJogador: latest.ggrMedioJogador || null
      },
      hasData: hasData
    };
  }, [filteredData]);

  // Preparar dados para os gráficos (TODOS os dados filtrados, não apenas últimos 20)
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];

    return filteredData.map(item => ({
      hora: item.hora || '',
      data: item.data || '',
      label: `${item.data} ${item.hora}`,
      GGR: item.ggr || 0,
      NGR: item.ngr || 0,
      Turnover: item.turnoverTotal || 0,
      Depositos: item.depositos || 0,
      Saques: item.saques || 0,
      tipo: item.tipoRelatorio
    }));
  }, [filteredData]);

  // Função helper para indicador de tendência
  const TrendIndicator = ({ value }) => {
    if (value > 5) return <span style={{ color: '#10b981' }}>↗️ +{value.toFixed(1)}%</span>;
    if (value < -5) return <span style={{ color: '#ef4444' }}>↘️ {value.toFixed(1)}%</span>;
    return <span style={{ color: '#f59e0b' }}>→ {value.toFixed(1)}%</span>;
  };

  // ==== NOVA FUNCIONALIDADE: EXPORTAÇÃO PARA CSV ====
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('Nenhum dado para exportar!');
      return;
    }

    // Definir cabeçalhos do CSV
    const headers = [
      'Data', 'Hora', 'Tipo Relatório', 'GGR', 'NGR', 'Turnover Total',
      'Depósitos', 'Saques', 'Fluxo Líquido', 'Jogadores Únicos', 'Apostadores', 'Depositantes',
      'Cassino GGR', 'Cassino Turnover', 'Sportsbook GGR', 'Sportsbook Turnover',
      'Saldo Inicial', 'Saldo Final', 'Variação Saldo',
      'Depósito Médio', 'Nº Médio Depósitos', 'Saque Médio', 'Ticket Médio', 'GGR Médio/Jogador',
      'Bônus Concedidos', 'Bônus Convertidos', 'Taxa Conversão Bônus', 'Apostas com Bônus', 'Custo Bônus',
      'Count'
    ];

    // Converter dados para CSV
    const csvRows = [
      headers.join(','), // Cabeçalho
      ...filteredData.map(item => [
        item.data || '',
        item.hora || '',
        item.tipoRelatorio || '',
        item.ggr || '',
        item.ngr || '',
        item.turnoverTotal || '',
        item.depositos || '',
        item.saques || '',
        item.fluxoLiquido || '',
        item.jogadoresUnicos || '',
        item.apostadores || '',
        item.depositantes || '',
        item.cassinoGGR || '',
        item.cassinoTurnover || '',
        item.sportsbookGGR || '',
        item.sportsbookTurnover || '',
        item.saldoInicial || '',
        item.saldoFinal || '',
        item.variacaoSaldo || '',
        item.depositoMedio || '',
        item.numeroMedioDepositos || '',
        item.saqueMedio || '',
        item.ticketMedio || '',
        item.ggrMedioJogador || '',
        item.bonusConcedidos || '',
        item.bonusConvertidos || '',
        item.taxaConversaoBonus || '',
        item.apostasComBonus || '',
        item.custoBonus || '',
        item.count || ''
      ].join(','))
    ];

    // Criar blob e download
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `dashboard-export-${timestamp}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'Arial' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '16px 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>
            Dashboard Slack - Domino Tech & Brew
          </h1>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? 'Carregando...' : 'Atualizar'}
            </button>
            <button
              onClick={exportToCSV}
              disabled={loading || !filteredData || filteredData.length === 0}
              style={{ padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: (loading || !filteredData || filteredData.length === 0) ? 'not-allowed' : 'pointer', opacity: (loading || !filteredData || filteredData.length === 0) ? 0.6 : 1 }}
              title="Exportar dados filtrados para CSV"
            >
              📥 Exportar CSV
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              Auto-refresh (30s)
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Error */}
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '16px', marginBottom: '24px', color: '#dc2626' }}>
            <strong>Erro:</strong> {error}
          </div>
        )}

        {/* ==== FILTROS INTERATIVOS ==== */}
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '24px' }}>
          <h3 style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
            Filtros de Análise
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
            {/* Filtro de Período */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Período
              </label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="all">Todo Histórico ({data.length} períodos)</option>
                <option value="today">Hoje</option>
                <option value="last20">Últimos 20 períodos</option>
                <option value="last50">Últimos 50 períodos</option>
              </select>
            </div>

            {/* Filtro de Tipo */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Tipo de Relatório
              </label>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
              >
                <option value="all">Todos</option>
                <option value="performance">Performance de Produtos</option>
                <option value="risco">Time de Risco</option>
              </select>
            </div>

            {/* Controle de Zoom/Pan */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Navegação nos Gráficos
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                <input
                  type="checkbox"
                  checked={showBrush}
                  onChange={(e) => setShowBrush(e.target.checked)}
                />
                <span style={{ fontSize: '14px' }}>Habilitar Zoom e Pan</span>
              </label>
            </div>

            {/* Info de Dados Filtrados */}
            <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Dados Exibidos</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                {filteredData.length} períodos
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                {filteredData.filter(d => d.tipoRelatorio === 'Performance de Produtos').length} Performance | {' '}
                {filteredData.filter(d => d.tipoRelatorio === 'Time de Risco').length} Risco
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards Expandidos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>GGR Médio</h3>
            <p style={{ color: '#3b82f6', fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              {metrics ? `R$ ${metrics.avgGGR.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : '-'}
            </p>
            {metrics && <TrendIndicator value={metrics.ggrTrend} />}
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>Margem de Lucro</h3>
            <p style={{ color: '#10b981', fontSize: '22px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
              {metrics ? `${metrics.margin.toFixed(1)}%` : '-'}
            </p>
            {metrics && <TrendIndicator value={metrics.marginTrend} />}
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>Taxa de Conversão</h3>
            <p style={{ color: '#8b5cf6', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              {metrics ? `${metrics.conversion.toFixed(2)}%` : '-'}
            </p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>Volatilidade</h3>
            <p style={{ color: '#f59e0b', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>
              {metrics ? `±${metrics.volatility.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}` : '-'}
            </p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>Status Backend</h3>
            <p style={{ color: error ? '#ef4444' : '#10b981', fontSize: '22px', fontWeight: 'bold', margin: 0 }}>{error ? 'Offline' : 'Online'}</p>
          </div>

          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ color: '#6b7280', fontSize: '13px', fontWeight: '500', margin: '0 0 8px 0' }}>Última Atualização</h3>
            <p style={{ color: '#6b7280', fontSize: '16px', fontWeight: '600', margin: 0 }}>{lastUpdate ? lastUpdate.split(' ')[1] : '-'}</p>
          </div>
        </div>

        {/* Gráficos Principais COM ZOOM E PAN */}
        {!loading && filteredData.length > 0 && chartData.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              {/* Gráfico de Linha - GGR e NGR COM BRUSH */}
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                  Evolução GGR x NGR ({chartData.length} pontos)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="GGR" stroke="#3b82f6" strokeWidth={2} name="GGR" dot={chartData.length <= 20} />
                    <Line type="monotone" dataKey="NGR" stroke="#10b981" strokeWidth={2} name="NGR" dot={chartData.length <= 20} />
                    {showBrush && chartData.length > 20 && <Brush dataKey="label" height={30} stroke="#3b82f6" />}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Comparação Cassino vs Sportsbook */}
              {produtosData && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                  <h3 style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                    Cassino vs Sportsbook (GGR)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={produtosData.pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {produtosData.pie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Cassino</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>{produtosData.cassinoPercent}%</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>Sportsbook</div>
                      <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>{produtosData.sportsPercent}%</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Gráfico Depósitos vs Saques COM BRUSH */}
              <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ color: '#1f2937', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px' }}>
                  Depósitos x Saques ({chartData.length} pontos)
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} interval="preserveStartEnd" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Depositos" fill="#10b981" name="Depósitos" />
                    <Bar dataKey="Saques" fill="#ef4444" name="Saques" />
                    {showBrush && chartData.length > 20 && <Brush dataKey="label" height={30} stroke="#10b981" />}
                  </BarChart>
                </ResponsiveContainer>
              </div>

            </div>
          </>
        )}

        {/* ==== BANNER INFO: CAMPOS DE BÔNUS AGUARDANDO DADOS ==== */}
        {bonusComportamentoData && !bonusComportamentoData.hasData && (
          <div style={{ marginBottom: '24px', padding: '20px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '2px solid #3b82f6' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
              <div style={{ fontSize: '32px' }}>📊</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ color: '#1e40af', fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>
                  13 Novos Campos de Bônus e Comportamento Implementados!
                </h3>
                <p style={{ color: '#1f2937', fontSize: '14px', margin: '0 0 12px 0' }}>
                  O dashboard agora está preparado para exibir análises detalhadas de:
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#4338ca', marginBottom: '4px' }}>🎁 Bônus e Promoções (5 campos)</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      • Bônus Concedidos<br/>
                      • Bônus Convertidos<br/>
                      • Taxa de Conversão<br/>
                      • Apostas com Bônus<br/>
                      • Custo de Bônus
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ca8a04', marginBottom: '4px' }}>💰 Saldo e Variação (3 campos)</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      • Saldo Inicial<br/>
                      • Saldo Final<br/>
                      • Variação de Saldo
                    </div>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'white', borderRadius: '6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#1d4ed8', marginBottom: '4px' }}>📈 Comportamento Financeiro (5 campos)</div>
                    <div style={{ fontSize: '11px', color: '#6b7280' }}>
                      • Depósito Médio<br/>
                      • Nº Médio de Depósitos<br/>
                      • Saque Médio<br/>
                      • Ticket Médio<br/>
                      • GGR Médio por Jogador
                    </div>
                  </div>
                </div>
                <div style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d' }}>
                  <div style={{ fontSize: '12px', color: '#92400e' }}>
                    <strong>⏳ Aguardando novos relatórios do Slack</strong><br/>
                    Estes campos serão preenchidos automaticamente quando o Slack enviar novos relatórios "Time de Risco" contendo essas informações.
                    O backend já está capturando e processando esses dados.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==== SEÇÃO EXPANDIDA: BÔNUS, SALDO E COMPORTAMENTO (13 CAMPOS) ==== */}
        {bonusComportamentoData && bonusComportamentoData.hasData && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ color: '#1f2937', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 Análise Detalhada: Bônus, Saldo e Comportamento Financeiro
              <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#6b7280', backgroundColor: '#f9fafb', padding: '4px 8px', borderRadius: '4px' }}>
                Dados do Relatório Time de Risco
              </span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>

              {/* CARD 1: BÔNUS E PROMOÇÕES (5 campos) */}
              {(bonusComportamentoData.bonus.concedidos || bonusComportamentoData.bonus.convertidos || bonusComportamentoData.bonus.taxaConversao) && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #e0e7ff' }}>
                  <h3 style={{ color: '#4338ca', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎁 Bônus e Promoções
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {bonusComportamentoData.bonus.concedidos && (
                      <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Bônus Concedidos</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                          R$ {bonusComportamentoData.bonus.concedidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.bonus.convertidos && (
                      <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Bônus Convertidos em Cash</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                          R$ {bonusComportamentoData.bonus.convertidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.bonus.taxaConversao && (
                      <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Taxa de Conversão de Bônus</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: bonusComportamentoData.bonus.taxaConversao > 20 ? '#10b981' : '#f59e0b' }}>
                          {bonusComportamentoData.bonus.taxaConversao.toFixed(1)}%
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.bonus.apostasComBonus && (
                      <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Apostas com Bônus</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                          R$ {bonusComportamentoData.bonus.apostasComBonus.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.bonus.custoBonus && (
                      <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Custo de Bônus (Impacto no NGR)</div>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                          R$ {bonusComportamentoData.bonus.custoBonus.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                        {bonusComportamentoData.bonus.concedidos && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {((bonusComportamentoData.bonus.custoBonus / bonusComportamentoData.bonus.concedidos) * 100).toFixed(1)}% do total concedido
                          </div>
                        )}
                      </div>
                    )}
                    {bonusComportamentoData.bonus.roi > 0 && (
                      <div style={{ marginTop: '8px', padding: '12px', backgroundColor: bonusComportamentoData.bonus.roi > 100 ? '#f0fdf4' : '#fff7ed', borderRadius: '6px', border: `2px dashed ${bonusComportamentoData.bonus.roi > 100 ? '#10b981' : '#f59e0b'}` }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>ROI de Bônus (GGR / Bônus)</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: bonusComportamentoData.bonus.roi > 100 ? '#10b981' : '#f59e0b' }}>
                          {bonusComportamentoData.bonus.roi.toFixed(0)}%
                        </div>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                          {bonusComportamentoData.bonus.roi > 100 ? '✅ ROI positivo - bônus efetivo' : '⚠️ ROI baixo - avaliar estratégia'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CARD 2: SALDO E VARIAÇÃO (3 campos) */}
              {(bonusComportamentoData.saldo.inicial || bonusComportamentoData.saldo.final || bonusComportamentoData.saldo.variacao) && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #fef3c7' }}>
                  <h3 style={{ color: '#ca8a04', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    💰 Saldo e Variação
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {bonusComportamentoData.saldo.inicial && (
                      <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Saldo Inicial</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                          R$ {bonusComportamentoData.saldo.inicial.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.saldo.final && (
                      <div style={{ padding: '12px', backgroundColor: '#fefce8', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Saldo Final</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                          R$ {bonusComportamentoData.saldo.final.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.saldo.variacao && (
                      <div style={{ padding: '12px', backgroundColor: bonusComportamentoData.saldo.variacao >= 0 ? '#f0fdf4' : '#fef2f2', borderRadius: '6px', borderLeft: `4px solid ${bonusComportamentoData.saldo.variacao >= 0 ? '#10b981' : '#ef4444'}` }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Variação de Saldo (Período)</div>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: bonusComportamentoData.saldo.variacao >= 0 ? '#10b981' : '#ef4444' }}>
                          {bonusComportamentoData.saldo.variacao >= 0 ? '↗️ +' : '↘️ '}
                          R$ {Math.abs(bonusComportamentoData.saldo.variacao).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                        {bonusComportamentoData.saldo.inicial && (
                          <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                            {((bonusComportamentoData.saldo.variacao / bonusComportamentoData.saldo.inicial) * 100).toFixed(1)}% do saldo inicial
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CARD 3: COMPORTAMENTO FINANCEIRO (5 campos) */}
              {(bonusComportamentoData.comportamento.depositoMedio || bonusComportamentoData.comportamento.ticketMedio || bonusComportamentoData.comportamento.ggrMedioJogador) && (
                <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '2px solid #dbeafe' }}>
                  <h3 style={{ color: '#1d4ed8', fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📈 Comportamento Financeiro (Médias)
                  </h3>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {bonusComportamentoData.comportamento.depositoMedio && (
                      <div style={{ padding: '12px', backgroundColor: '#f0fdf4', borderRadius: '6px', borderLeft: '4px solid #10b981' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Depósito Médio / Depositante</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                          R$ {bonusComportamentoData.comportamento.depositoMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.comportamento.numeroMedioDepositos && (
                      <div style={{ padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Nº Médio de Depósitos / Depositante</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1f2937' }}>
                          {bonusComportamentoData.comportamento.numeroMedioDepositos.toFixed(1)}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.comportamento.saqueMedio && (
                      <div style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '4px solid #ef4444' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Saque Médio / Sacador</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
                          R$ {bonusComportamentoData.comportamento.saqueMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.comportamento.ticketMedio && (
                      <div style={{ padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>Ticket Médio / Jogador Ativo</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                          R$ {bonusComportamentoData.comportamento.ticketMedio.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                    {bonusComportamentoData.comportamento.ggrMedioJogador && (
                      <div style={{ padding: '12px', backgroundColor: '#fdf4ff', borderRadius: '6px', borderLeft: '4px solid #8b5cf6' }}>
                        <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600' }}>GGR Médio / Jogador Ativo</div>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6' }}>
                          R$ {bonusComportamentoData.comportamento.ggrMedioJogador.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Nota de Rodapé */}
            <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fcd34d', fontSize: '13px', color: '#92400e' }}>
              <strong>ℹ️ Nota:</strong> Estes campos serão preenchidos automaticamente quando o Slack enviar novos relatórios com essas informações.
              Dados históricos anteriores à implementação dos parsers podem aparecer como "N/A".
            </div>
          </div>
        )}

        {/* Tabela de Últimos Relatórios */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ color: '#1f2937', fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>
            {filteredData.length > 0 ? `Relatórios Financeiros (${filteredData.length} períodos)` : 'Dados do Dashboard'}
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>Carregando dados...</div>
          ) : filteredData.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Data</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Hora</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Tipo</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>GGR</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>NGR</th>
                    <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Turnover</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600', color: '#374151' }}>Count</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice().reverse().slice(0, 50).map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{item.data || '-'}</td>
                      <td style={{ padding: '12px', color: '#6b7280' }}>{item.hora || '-'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-block', backgroundColor: item.tipoRelatorio === 'Performance de Produtos' ? '#dbeafe' : '#fef3c7', color: item.tipoRelatorio === 'Performance de Produtos' ? '#1e40af' : '#92400e', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                          {item.tipoRelatorio === 'Performance de Produtos' ? 'Performance' : 'Risco'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                        {item.ggr ? `R$ ${Number(item.ggr).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                        {item.ngr ? `R$ ${Number(item.ngr).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                        {item.turnoverTotal ? `R$ ${Number(item.turnoverTotal).toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                        {item.count || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              Aguardando dados do backend...
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', padding: '16px', color: '#6b7280', fontSize: '14px' }}>
          <p style={{ margin: 0 }}>
            Dashboard v4.1 - 13 Campos + Filtros + Exportação CSV | Exibindo {filteredData.length} de {data.length} períodos | Status: {loading ? 'Carregando...' : autoRefresh ? 'Auto-refresh ativo' : 'Pausado'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
