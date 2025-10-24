import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
  RadialBarChart, RadialBar, ComposedChart
} from 'recharts';

const App = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Filtros
  const [periodFilter, setPeriodFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [showBrush, setShowBrush] = useState(true);

  // ==== PALETA DE CORES PROFISSIONAL (estilo Grafana) ====
  const colors = {
    primary: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
    pink: '#ec4899',
    indigo: '#6366f1',
    gradient: {
      blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
      green: ['#10b981', '#34d399', '#6ee7b7'],
      purple: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
      orange: ['#f59e0b', '#fbbf24', '#fcd34d']
    },
    bg: {
      light: '#ffffff',
      dark: '#1f2937',
      card: '#f9fafb',
      cardDark: '#374151'
    },
    text: {
      primary: '#1f2937',
      secondary: '#6b7280',
      light: '#9ca3af'
    }
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/dashboard-data');
      if (!response.ok) throw new Error('Erro ao conectar com o backend');
      const result = await response.json();
      setData(result.data || []);
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadData]);

  // Dados filtrados
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let filtered = [...data];
    if (tipoFilter === 'performance') filtered = filtered.filter(item => item.tipoRelatorio === 'Performance de Produtos');
    else if (tipoFilter === 'risco') filtered = filtered.filter(item => item.tipoRelatorio === 'Time de Risco');
    if (periodFilter === 'today') {
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      filtered = filtered.filter(item => item.data === today);
    } else if (periodFilter === 'last20') filtered = filtered.slice(-20);
    else if (periodFilter === 'last50') filtered = filtered.slice(-50);
    return filtered;
  }, [data, periodFilter, tipoFilter]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    const validData = filteredData.filter(item => item.ggr && item.ngr);
    if (validData.length === 0) return null;

    const avgGGR = validData.reduce((sum, item) => sum + item.ggr, 0) / validData.length;
    const avgNGR = validData.reduce((sum, item) => sum + item.ngr, 0) / validData.length;
    const margin = (avgNGR / avgGGR) * 100;
    const variance = validData.reduce((sum, item) => sum + Math.pow(item.ggr - avgGGR, 2), 0) / validData.length;
    const volatility = Math.sqrt(variance);

    // Tendências
    let ggrTrend = 0, marginTrend = 0;
    if (validData.length >= 2) {
      const current = validData[validData.length - 1];
      const previous = validData[validData.length - 2];
      ggrTrend = ((current.ggr - previous.ggr) / previous.ggr) * 100;
      const currentMargin = (current.ngr / current.ggr) * 100;
      const previousMargin = (previous.ngr / previous.ggr) * 100;
      marginTrend = ((currentMargin - previousMargin) / previousMargin) * 100;
    }

    // Sparkline data (últimos 10 pontos)
    const sparklineData = validData.slice(-10).map(item => item.ggr);

    return { avgGGR, avgNGR, margin, volatility, ggrTrend, marginTrend, sparklineData };
  }, [filteredData]);

  // Dados para gráficos
  const chartData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return [];
    return filteredData.map(item => ({
      label: `${item.data} ${item.hora}`,
      GGR: item.ggr || 0,
      NGR: item.ngr || 0,
      Turnover: item.turnoverTotal || 0,
      Depositos: item.depositos || 0,
      Saques: item.saques || 0
    }));
  }, [filteredData]);

  // Produtos data
  const produtosData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    const perfData = filteredData.filter(item => item.tipoRelatorio === 'Performance de Produtos' && item.cassinoGGR && item.sportsbookGGR);
    if (perfData.length === 0) return null;
    const latest = perfData[perfData.length - 1];
    const total = latest.cassinoGGR + latest.sportsbookGGR;
    return {
      cassino: { value: latest.cassinoGGR, percent: (latest.cassinoGGR / total) * 100 },
      sportsbook: { value: latest.sportsbookGGR, percent: (latest.sportsbookGGR / total) * 100 }
    };
  }, [filteredData]);

  // Exportar CSV
  const exportToCSV = () => {
    if (!filteredData || filteredData.length === 0) {
      alert('Nenhum dado para exportar!');
      return;
    }
    const headers = ['Data', 'Hora', 'Tipo', 'GGR', 'NGR', 'Turnover', 'Depósitos', 'Saques'];
    const csvRows = [
      headers.join(','),
      ...filteredData.map(item => [
        item.data || '', item.hora || '', item.tipoRelatorio || '',
        item.ggr || '', item.ngr || '', item.turnoverTotal || '',
        item.depositos || '', item.saques || ''
      ].join(','))
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==== COMPONENTES DE VISUALIZAÇÃO ====

  // Stat Card com Sparkline (estilo Grafana)
  const StatCard = ({ title, value, trend, sparklineData, unit = '', icon }) => (
    <div style={{
      backgroundColor: darkMode ? colors.bg.cardDark : colors.bg.light,
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', color: colors.text.secondary, fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </div>
        {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 'bold', color: darkMode ? '#fff' : colors.text.primary, marginBottom: '8px' }}>
        {value}{unit}
      </div>
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '14px',
            fontWeight: '600',
            color: trend > 0 ? colors.success : trend < 0 ? colors.danger : colors.warning
          }}>
            {trend > 0 ? '↗' : trend < 0 ? '↘' : '→'} {Math.abs(trend).toFixed(1)}%
          </span>
          <span style={{ fontSize: '12px', color: colors.text.light }}>vs período anterior</span>
        </div>
      )}
      {sparklineData && sparklineData.length > 0 && (
        <div style={{ marginTop: '12px', height: '40px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sparklineData.map((val, idx) => ({ idx, val }))}>
              <defs>
                <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.primary} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors.primary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="val" stroke={colors.primary} strokeWidth={2} fill="url(#sparkGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );

  // Gauge Chart Component
  const GaugeChart = ({ value, max, title, color }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const gaugeData = [{ name: title, value: percentage, fill: color }];

    return (
      <div style={{
        backgroundColor: darkMode ? colors.bg.cardDark : colors.bg.light,
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`
      }}>
        <h3 style={{ fontSize: '14px', color: colors.text.secondary, marginBottom: '16px', textAlign: 'center', fontWeight: '600' }}>
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={gaugeData}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              minAngle={15}
              background
              clockWise={true}
              dataKey="value"
              cornerRadius={10}
            />
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontSize: '32px', fontWeight: 'bold', fill: color }}
            >
              {value.toFixed(1)}{max === 100 ? '%' : ''}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '13px', color: colors.text.light }}>
          {percentage.toFixed(0)}% do máximo
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: darkMode ? '#111827' : '#f3f4f6',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      transition: 'background-color 0.3s ease'
    }}>
      {/* ==== HEADER MELHORADO ==== */}
      <div style={{
        background: darkMode ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '20px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff', margin: '0 0 4px 0', letterSpacing: '-0.5px' }}>
                📊 Dashboard Analytics
              </h1>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>
                Domino Tech & Brew · Última atualização: {lastUpdate || 'Carregando...'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={loadData}
                disabled={loading}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  transition: 'all 0.2s',
                  backdropFilter: 'blur(10px)'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.2)')}
              >
                {loading ? '⏳ Carregando...' : '🔄 Atualizar'}
              </button>
              <button
                onClick={exportToCSV}
                disabled={loading || !filteredData || filteredData.length === 0}
                style={{
                  padding: '10px 20px',
                  backgroundColor: colors.success,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (loading || !filteredData || filteredData.length === 0) ? 'not-allowed' : 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  opacity: (loading || !filteredData || filteredData.length === 0) ? 0.5 : 1
                }}
              >
                📥 Exportar CSV
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Auto-refresh (30s)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ==== MAIN CONTENT ==== */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '2px solid #ef4444',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <strong>Erro de Conexão:</strong> {error}
            </div>
          </div>
        )}

        {/* ==== FILTROS MODERNOS ==== */}
        <div style={{
          backgroundColor: darkMode ? colors.bg.cardDark : colors.bg.light,
          padding: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          marginBottom: '32px',
          border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`
        }}>
          <h3 style={{ color: darkMode ? '#fff' : colors.text.primary, fontSize: '16px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🎯 Filtros de Análise
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text.secondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📅 Período
              </label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: darkMode ? '#1f2937' : '#fff',
                  color: darkMode ? '#fff' : colors.text.primary,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <option value="all">📊 Todo Histórico ({data.length} períodos)</option>
                <option value="today">📆 Hoje</option>
                <option value="last20">📉 Últimos 20 períodos</option>
                <option value="last50">📈 Últimos 50 períodos</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: colors.text.secondary, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📋 Tipo de Relatório
              </label>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: `2px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  backgroundColor: darkMode ? '#1f2937' : '#fff',
                  color: darkMode ? '#fff' : colors.text.primary,
                  cursor: 'pointer'
                }}
              >
                <option value="all">🎯 Todos os Tipos</option>
                <option value="performance">🎰 Performance de Produtos</option>
                <option value="risco">⚠️ Time de Risco</option>
              </select>
            </div>
            <div style={{
              backgroundColor: darkMode ? '#1f2937' : '#f0f9ff',
              padding: '16px',
              borderRadius: '8px',
              border: `2px solid ${darkMode ? '#4b5563' : '#3b82f6'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: '4px', fontWeight: '600' }}>Dados Exibidos</div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.primary }}>
                {filteredData.length}
              </div>
              <div style={{ fontSize: '11px', color: colors.text.light, marginTop: '4px' }}>
                {filteredData.filter(d => d.tipoRelatorio === 'Performance de Produtos').length} Performance · {filteredData.filter(d => d.tipoRelatorio === 'Time de Risco').length} Risco
              </div>
            </div>
          </div>
        </div>

        {/* ==== KPI CARDS (ESTILO GRAFANA) ==== */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
            <StatCard
              title="💰 GGR Médio"
              value={`R$ ${metrics.avgGGR.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
              trend={metrics.ggrTrend}
              sparklineData={metrics.sparklineData}
              icon="📈"
            />
            <StatCard
              title="📊 Margem de Lucro"
              value={metrics.margin.toFixed(1)}
              unit="%"
              trend={metrics.marginTrend}
              icon="💹"
            />
            <StatCard
              title="⚡ Volatilidade"
              value={`±${metrics.volatility.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
              icon="📉"
            />
            <StatCard
              title="✅ Status Backend"
              value={error ? 'Offline' : 'Online'}
              icon={error ? '🔴' : '🟢'}
            />
          </div>
        )}

        {/* ==== GRÁFICOS PRINCIPAIS ==== */}
        {!loading && filteredData.length > 0 && chartData.length > 0 && (
          <>
            {/* Row 1: Area Chart + Gauge Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>

              {/* Area Chart - GGR x NGR */}
              <div style={{
                backgroundColor: darkMode ? colors.bg.cardDark : colors.bg.light,
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                gridColumn: 'span 2'
              }}>
                <h3 style={{ color: darkMode ? '#fff' : colors.text.primary, fontSize: '18px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📈 Evolução GGR x NGR <span style={{ fontSize: '14px', fontWeight: 'normal', color: colors.text.light }}>({chartData.length} pontos)</span>
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="colorGGR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNGR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.success} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors.success} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval="preserveStartEnd"
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#fff',
                        border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="GGR"
                      stroke={colors.primary}
                      strokeWidth={3}
                      fill="url(#colorGGR)"
                      name="GGR"
                    />
                    <Line
                      type="monotone"
                      dataKey="NGR"
                      stroke={colors.success}
                      strokeWidth={3}
                      name="NGR"
                      dot={{ r: 4 }}
                    />
                    {showBrush && chartData.length > 20 && <Brush dataKey="label" height={30} stroke={colors.primary} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Gauge Charts */}
              {metrics && (
                <>
                  <GaugeChart
                    title="Margem de Lucro"
                    value={metrics.margin}
                    max={100}
                    color={colors.success}
                  />
                  <GaugeChart
                    title="Performance GGR"
                    value={Math.min((metrics.avgGGR / 1000) * 100, 100)}
                    max={100}
                    color={colors.primary}
                  />
                </>
              )}
            </div>

            {/* Row 2: Cassino vs Sportsbook + Depósitos vs Saques */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>

              {/* Cassino vs Sportsbook */}
              {produtosData && (
                <div style={{
                  backgroundColor: darkMode ? colors.bg.cardDark : colors.bg.light,
                  padding: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`
                }}>
                  <h3 style={{ color: darkMode ? '#fff' : colors.text.primary, fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                    🎰 Cassino vs Sportsbook
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Cassino', value: produtosData.cassino.value, fill: colors.purple },
                          { name: 'Sportsbook', value: produtosData.sportsbook.value, fill: colors.success }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: darkMode ? '#1f2937' : '#fff',
                          border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: '4px' }}>Cassino</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.purple }}>
                        {produtosData.cassino.percent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '13px', color: colors.text.light }}>
                        R$ {produtosData.cassino.value.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: colors.text.secondary, marginBottom: '4px' }}>Sportsbook</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.success }}>
                        {produtosData.sportsbook.percent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '13px', color: colors.text.light }}>
                        R$ {produtosData.sportsbook.value.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Depósitos vs Saques */}
              <div style={{
                backgroundColor: darkMode ? colors.bg.cardDark : colors.bg.light,
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`
              }}>
                <h3 style={{ color: darkMode ? '#fff' : colors.text.primary, fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>
                  💵 Depósitos x Saques
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval="preserveStartEnd"
                      stroke={darkMode ? '#9ca3af' : '#6b7280'}
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis stroke={darkMode ? '#9ca3af' : '#6b7280'} style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: darkMode ? '#1f2937' : '#fff',
                        border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Depositos" fill={colors.success} name="Depósitos" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="Saques" fill={colors.danger} name="Saques" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: colors.text.secondary }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
            <div style={{ fontSize: '18px', fontWeight: '600' }}>Carregando dados...</div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: colors.text.secondary }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📊</div>
            <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>Nenhum dado disponível</div>
            <div style={{ fontSize: '14px' }}>Aguardando mensagens do Slack...</div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '48px',
          padding: '24px',
          color: colors.text.light,
          fontSize: '13px',
          borderTop: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`
        }}>
          <p style={{ margin: 0, fontWeight: '500' }}>
            Dashboard v5.0 Pro · {filteredData.length} de {data.length} períodos ·
            {loading ? ' Carregando...' : autoRefresh ? ' Auto-refresh ativo 🟢' : ' Pausado ⏸️'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
