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
  const [darkMode, setDarkMode] = useState(true); // Default dark

  const [periodFilter, setPeriodFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [activeDashboard, setActiveDashboard] = useState('overview'); // overview, bonus, produtos

  // ==== PALETA INSPIRADA EM SEGURO.BET.BR ====
  const colors = {
    // Cores principais (seguro.bet.br style)
    gold: '#d9a00d',
    goldLight: '#ffb703',
    goldDark: '#b58900',
    lime: '#0dff99',
    limeLight: '#5fff5f',
    limeDark: '#00d97e',

    // Backgrounds com profundidade
    dark: {
      primary: '#0a0e27',
      secondary: '#0c0c0c',
      tertiary: '#1a1d35',
      card: 'rgba(26, 29, 53, 0.6)',
      cardHover: 'rgba(26, 29, 53, 0.8)',
    },
    light: {
      primary: '#f8fafc',
      secondary: '#ffffff',
      card: 'rgba(255, 255, 255, 0.7)',
      cardHover: 'rgba(255, 255, 255, 0.9)',
    },

    // Cores funcionais
    success: '#00ff88',
    warning: '#fbbf24',
    danger: '#ff4757',
    purple: '#a855f7',
    cyan: '#00f5ff',

    // Texto
    text: {
      primary: '#ffffff',
      secondary: '#b4bcd0',
      tertiary: '#6b7280',
      gold: '#d9a00d'
    },

    // Gradientes ultra-modernos
    gradients: {
      gold: 'linear-gradient(135deg, #d9a00d 0%, #ffb703 100%)',
      lime: 'linear-gradient(135deg, #00ff88 0%, #0dff99 100%)',
      dark: 'linear-gradient(135deg, #0a0e27 0%, #1a1d35 100%)',
      purple: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
      blueGreen: 'linear-gradient(135deg, #00f5ff 0%, #00ff88 100%)',
      sunset: 'linear-gradient(135deg, #ff4757 0%, #d9a00d 50%, #00ff88 100%)',
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

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    let filtered = [...data];

    // Aplicar filtro de tipo primeiro
    if (tipoFilter === 'performance') filtered = filtered.filter(item => item.tipoRelatorio === 'Performance de Produtos');
    else if (tipoFilter === 'risco') filtered = filtered.filter(item => item.tipoRelatorio === 'Time de Risco');

    // Aplicar filtro de período
    if (periodFilter === 'today') {
      // Usar a última data disponível nos dados ao invés da data atual
      if (filtered.length > 0) {
        const lastDate = filtered[filtered.length - 1].data;
        filtered = filtered.filter(item => item.data === lastDate);
      }
    } else if (periodFilter === 'yesterday') {
      // Segunda última data disponível
      if (filtered.length > 0) {
        const uniqueDates = [...new Set(filtered.map(item => item.data))].sort();
        if (uniqueDates.length >= 2) {
          const yesterdayDate = uniqueDates[uniqueDates.length - 2];
          filtered = filtered.filter(item => item.data === yesterdayDate);
        }
      }
    } else if (periodFilter === 'last7days') {
      // Últimos 7 dias únicos
      if (filtered.length > 0) {
        const uniqueDates = [...new Set(filtered.map(item => item.data))].sort();
        const last7Dates = uniqueDates.slice(-7);
        filtered = filtered.filter(item => last7Dates.includes(item.data));
      }
    } else if (periodFilter === 'last20') {
      filtered = filtered.slice(-20);
    } else if (periodFilter === 'last50') {
      filtered = filtered.slice(-50);
    } else if (periodFilter === 'last100') {
      filtered = filtered.slice(-100);
    }

    return filtered;
  }, [data, periodFilter, tipoFilter]);

  const metrics = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    const validData = filteredData.filter(item => item.ggr && item.ngr);
    if (validData.length === 0) return null;

    const avgGGR = validData.reduce((sum, item) => sum + item.ggr, 0) / validData.length;
    const avgNGR = validData.reduce((sum, item) => sum + item.ngr, 0) / validData.length;
    const margin = (avgNGR / avgGGR) * 100;
    const variance = validData.reduce((sum, item) => sum + Math.pow(item.ggr - avgGGR, 2), 0) / validData.length;
    const volatility = Math.sqrt(variance);

    let ggrTrend = 0, marginTrend = 0;
    if (validData.length >= 2) {
      const current = validData[validData.length - 1];
      const previous = validData[validData.length - 2];
      ggrTrend = ((current.ggr - previous.ggr) / previous.ggr) * 100;
      const currentMargin = (current.ngr / current.ggr) * 100;
      const previousMargin = (previous.ngr / previous.ggr) * 100;
      marginTrend = ((currentMargin - previousMargin) / previousMargin) * 100;
    }

    const sparklineData = validData.slice(-10).map(item => item.ggr);
    return { avgGGR, avgNGR, margin, volatility, ggrTrend, marginTrend, sparklineData };
  }, [filteredData]);

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

  const bonusData = useMemo(() => {
    if (!filteredData || filteredData.length === 0) return null;
    const bonusItems = filteredData.filter(item =>
      item.tipoRelatorio === 'Time de Risco' &&
      item.bonusConcedidos !== null &&
      item.bonusConcedidos !== undefined
    );
    if (bonusItems.length === 0) return null;

    const totalConcedidos = bonusItems.reduce((sum, item) => sum + (item.bonusConcedidos || 0), 0);
    const totalConvertidos = bonusItems.reduce((sum, item) => sum + (item.bonusConvertidos || 0), 0);
    const totalApostasBonus = bonusItems.reduce((sum, item) => sum + (item.apostasComBonus || 0), 0);
    const totalCusto = bonusItems.reduce((sum, item) => sum + (item.custoBonus || 0), 0);
    const avgTaxaConversao = bonusItems.reduce((sum, item) => sum + (item.taxaConversaoBonus || 0), 0) / bonusItems.length;

    const chartData = bonusItems.map(item => ({
      label: `${item.data} ${item.hora}`,
      Concedidos: item.bonusConcedidos || 0,
      Convertidos: item.bonusConvertidos || 0,
      Taxa: item.taxaConversaoBonus || 0,
      Custo: item.custoBonus || 0
    }));

    return {
      totalConcedidos,
      totalConvertidos,
      totalApostasBonus,
      totalCusto,
      avgTaxaConversao,
      chartData,
      count: bonusItems.length
    };
  }, [filteredData]);

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

  // ==== COMPONENTES COM GLASSMORPHISM ====

  // Glass Card com blur ultra-moderno
  const GlassCard = ({ children, style, hover = true }) => (
    <div style={{
      background: darkMode ? colors.dark.card : colors.light.card,
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
      borderRadius: '20px',
      padding: '24px',
      boxShadow: darkMode
        ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        : '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
      transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
      cursor: hover ? 'pointer' : 'default',
      ...style
    }}
    onMouseEnter={(e) => {
      if (hover) {
        e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
        e.currentTarget.style.boxShadow = darkMode
          ? '0 16px 48px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 16px 48px 0 rgba(31, 38, 135, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.5)';
        e.currentTarget.style.background = darkMode ? colors.dark.cardHover : colors.light.cardHover;
      }
    }}
    onMouseLeave={(e) => {
      if (hover) {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = darkMode
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
          : '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
        e.currentTarget.style.background = darkMode ? colors.dark.card : colors.light.card;
      }
    }}
    >
      {children}
    </div>
  );

  // Stat Card com efeito neon e glassmorphism
  const StatCard = ({ title, value, trend, sparklineData, unit = '', icon, gradient }) => (
    <GlassCard>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{
            fontSize: '11px',
            color: colors.text.secondary,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '1.5px',
            textShadow: darkMode ? '0 0 10px rgba(13, 255, 153, 0.3)' : 'none'
          }}>
            {title}
          </div>
          {icon && (
            <div style={{
              fontSize: '24px',
              filter: 'drop-shadow(0 0 8px rgba(217, 160, 13, 0.6))'
            }}>
              {icon}
            </div>
          )}
        </div>
        <div style={{
          fontSize: '36px',
          fontWeight: '800',
          background: gradient || colors.gradients.gold,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '12px',
          textShadow: '0 0 20px rgba(217, 160, 13, 0.5)'
        }}>
          {value}{unit}
        </div>
        {trend !== undefined && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '15px',
              fontWeight: '700',
              color: trend > 0 ? colors.success : trend < 0 ? colors.danger : colors.warning,
              textShadow: `0 0 10px ${trend > 0 ? colors.success : trend < 0 ? colors.danger : colors.warning}50`
            }}>
              {trend > 0 ? '▲' : trend < 0 ? '▼' : '●'} {Math.abs(trend).toFixed(1)}%
            </span>
            <span style={{ fontSize: '12px', color: colors.text.tertiary }}>vs anterior</span>
          </div>
        )}
        {sparklineData && sparklineData.length > 0 && (
          <div style={{ marginTop: '16px', height: '50px', opacity: 0.9 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.map((val, idx) => ({ idx, val }))}>
                <defs>
                  <linearGradient id={`sparkGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.lime} stopOpacity={0.6} />
                    <stop offset="100%" stopColor={colors.lime} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="val"
                  stroke={colors.lime}
                  strokeWidth={3}
                  fill={`url(#sparkGradient-${title})`}
                  filter="drop-shadow(0 0 6px rgba(13, 255, 153, 0.8))"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </GlassCard>
  );

  // Gauge com glassmorphism
  const GaugeChart = ({ value, max, title, color }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const gaugeData = [{ name: title, value: percentage, fill: color }];

    return (
      <GlassCard>
        <h3 style={{
          fontSize: '13px',
          color: colors.text.secondary,
          marginBottom: '20px',
          textAlign: 'center',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '1.2px'
        }}>
          {title}
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={gaugeData}
            startAngle={180}
            endAngle={0}
          >
            <defs>
              <linearGradient id={`gaugeGradient-${title}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={colors.gold} />
                <stop offset="100%" stopColor={colors.lime} />
              </linearGradient>
            </defs>
            <RadialBar
              minAngle={15}
              background={{ fill: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
              clockWise={true}
              dataKey="value"
              cornerRadius={15}
              fill={`url(#gaugeGradient-${title})`}
            />
            <text
              x="50%"
              y="45%"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{
                fontSize: '40px',
                fontWeight: '900',
                fill: darkMode ? colors.gold : colors.goldDark,
                filter: 'drop-shadow(0 0 10px rgba(217, 160, 13, 0.8))'
              }}
            >
              {value.toFixed(1)}{max === 100 ? '%' : ''}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
        <div style={{
          textAlign: 'center',
          marginTop: '12px',
          fontSize: '12px',
          color: colors.text.tertiary,
          fontWeight: '600'
        }}>
          {percentage.toFixed(0)}% de {max}
        </div>
      </GlassCard>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode
        ? `radial-gradient(ellipse at top, ${colors.dark.tertiary} 0%, ${colors.dark.primary} 50%, ${colors.dark.secondary} 100%)`
        : `radial-gradient(ellipse at top, #e0f2fe 0%, #f8fafc 50%, #ffffff 100%)`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      transition: 'background 0.5s ease',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Efeitos de fundo decorativos */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-20%',
        width: '800px',
        height: '800px',
        background: colors.gradients.blueGreen,
        borderRadius: '50%',
        filter: 'blur(120px)',
        opacity: darkMode ? 0.1 : 0.05,
        zIndex: 0,
        animation: 'float 20s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-30%',
        left: '-10%',
        width: '600px',
        height: '600px',
        background: colors.gradients.purple,
        borderRadius: '50%',
        filter: 'blur(100px)',
        opacity: darkMode ? 0.08 : 0.04,
        zIndex: 0,
        animation: 'float 25s ease-in-out infinite reverse'
      }} />

      {/* ==== HEADER COM GLASSMORPHISM ULTRA ====*/}
      <div style={{
        background: darkMode
          ? 'linear-gradient(135deg, rgba(10, 14, 39, 0.8) 0%, rgba(26, 29, 53, 0.8) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.8) 0%, rgba(248, 250, 252, 0.8) 100%)',
        backdropFilter: 'blur(30px) saturate(200%)',
        WebkitBackdropFilter: 'blur(30px) saturate(200%)',
        boxShadow: darkMode
          ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 -1px 0 rgba(255, 255, 255, 0.1)'
          : '0 8px 32px 0 rgba(31, 38, 135, 0.15), inset 0 -1px 0 rgba(255, 255, 255, 0.5)',
        borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
        padding: '24px 0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        transition: 'all 0.3s ease'
      }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{
                fontSize: '32px',
                fontWeight: '900',
                background: colors.gradients.gold,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                margin: '0 0 6px 0',
                letterSpacing: '-1px',
                textShadow: '0 0 30px rgba(217, 160, 13, 0.4)',
                filter: 'drop-shadow(0 0 20px rgba(217, 160, 13, 0.6))'
              }}>
                ⚡ Dashboard Analytics Ultra
              </h1>
              <p style={{
                fontSize: '13px',
                color: colors.text.secondary,
                margin: 0,
                fontWeight: '600',
                letterSpacing: '0.5px'
              }}>
                Domino Tech & Brew · {lastUpdate || 'Carregando...'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={loadData}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: darkMode
                    ? 'linear-gradient(135deg, rgba(13, 255, 153, 0.2) 0%, rgba(0, 217, 126, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(37, 99, 235, 0.2) 100%)',
                  color: darkMode ? colors.lime : colors.text.primary,
                  border: `2px solid ${darkMode ? colors.lime : '#3b82f6'}`,
                  borderRadius: '12px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 0 20px ${darkMode ? colors.lime : '#3b82f6'}40`,
                  textShadow: darkMode ? `0 0 10px ${colors.lime}` : 'none'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = `0 8px 30px ${darkMode ? colors.lime : '#3b82f6'}60`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = `0 0 20px ${darkMode ? colors.lime : '#3b82f6'}40`;
                }}
              >
                {loading ? '⏳ Carregando...' : '🔄 Atualizar'}
              </button>
              <button
                onClick={exportToCSV}
                disabled={loading || !filteredData || filteredData.length === 0}
                style={{
                  padding: '12px 24px',
                  background: colors.gradients.gold,
                  color: '#000',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (loading || !filteredData || filteredData.length === 0) ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  opacity: (loading || !filteredData || filteredData.length === 0) ? 0.5 : 1,
                  boxShadow: '0 0 25px rgba(217, 160, 13, 0.6)',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)'
                }}
                onMouseEnter={(e) => {
                  if (!loading && filteredData && filteredData.length > 0) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 8px 35px rgba(217, 160, 13, 0.8)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 25px rgba(217, 160, 13, 0.6)';
                }}
              >
                📥 Exportar CSV
              </button>
              <button
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  padding: '12px 16px',
                  background: darkMode
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.05) 100%)',
                  color: darkMode ? colors.gold : '#000',
                  border: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease',
                  boxShadow: darkMode ? '0 0 15px rgba(217, 160, 13, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'rotate(180deg) scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'rotate(0deg) scale(1)';
                }}
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: colors.text.primary,
                fontSize: '14px',
                fontWeight: '600',
                padding: '8px 16px',
                background: darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                borderRadius: '12px',
                backdropFilter: 'blur(10px)',
                border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`
              }}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: colors.gold }}
                />
                Auto-refresh
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ==== NAVIGATION TABS ==== */}
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 24px',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          gap: '12px',
          borderBottom: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
          paddingBottom: '0'
        }}>
          {[
            { id: 'overview', label: '📊 Overview', icon: '📊' },
            { id: 'bonus', label: '🎁 Bônus', icon: '🎁' },
            { id: 'produtos', label: '🎰 Produtos', icon: '🎰' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDashboard(tab.id)}
              style={{
                padding: '16px 32px',
                background: activeDashboard === tab.id
                  ? (darkMode ? colors.gradients.gold : colors.gradients.gold)
                  : 'transparent',
                color: activeDashboard === tab.id ? '#000' : colors.text.secondary,
                border: 'none',
                borderRadius: '12px 12px 0 0',
                cursor: 'pointer',
                fontWeight: '800',
                fontSize: '15px',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                position: 'relative',
                boxShadow: activeDashboard === tab.id ? `0 -4px 20px ${colors.gold}40` : 'none',
                transform: activeDashboard === tab.id ? 'translateY(2px)' : 'translateY(0)',
                backdropFilter: activeDashboard === tab.id ? 'blur(10px)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (activeDashboard !== tab.id) {
                  e.currentTarget.style.color = colors.text.primary;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (activeDashboard !== tab.id) {
                  e.currentTarget.style.color = colors.text.secondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ==== MAIN CONTENT ==== */}
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '40px 24px', position: 'relative', zIndex: 1 }}>

        {error && (
          <GlassCard hover={false} style={{
            marginBottom: '32px',
            border: `2px solid ${colors.danger}`,
            background: darkMode
              ? 'rgba(255, 71, 87, 0.1)'
              : 'rgba(255, 71, 87, 0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <span style={{ fontSize: '32px', filter: `drop-shadow(0 0 10px ${colors.danger})` }}>⚠️</span>
              <div>
                <strong style={{ color: colors.danger, fontSize: '16px' }}>Erro de Conexão:</strong>
                <p style={{ color: colors.text.secondary, margin: '4px 0 0 0', fontSize: '14px' }}>{error}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* ==== FILTROS GLASSMORPHISM ==== */}
        <GlassCard hover={false} style={{ marginBottom: '32px' }}>
          <h3 style={{
            color: colors.text.primary,
            fontSize: '18px',
            fontWeight: '800',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            background: colors.gradients.lime,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            🎯 Filtros de Análise
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '700',
                color: colors.text.secondary,
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.2px'
              }}>
                📅 Período
              </label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: darkMode ? 'rgba(26, 29, 53, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  color: colors.text.primary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.gold;
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.gold}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="all">📊 Todo Histórico ({data.length})</option>
                <option value="today">📆 Último Dia Disponível</option>
                <option value="yesterday">📅 Penúltimo Dia</option>
                <option value="last7days">📅 Últimos 7 Dias</option>
                <option value="last20">📉 Últimos 20 Períodos</option>
                <option value="last50">📈 Últimos 50 Períodos</option>
                <option value="last100">📊 Últimos 100 Períodos</option>
              </select>
            </div>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '700',
                color: colors.text.secondary,
                marginBottom: '10px',
                textTransform: 'uppercase',
                letterSpacing: '1.2px'
              }}>
                📋 Tipo de Relatório
              </label>
              <select
                value={tipoFilter}
                onChange={(e) => setTipoFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  background: darkMode ? 'rgba(26, 29, 53, 0.6)' : 'rgba(255, 255, 255, 0.8)',
                  color: colors.text.primary,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(10px)',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.gold;
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.gold}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="all">🎯 Todos</option>
                <option value="performance">🎰 Performance</option>
                <option value="risco">⚠️ Risco</option>
              </select>
            </div>
            <div style={{
              background: darkMode
                ? 'linear-gradient(135deg, rgba(217, 160, 13, 0.1) 0%, rgba(13, 255, 153, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(217, 160, 13, 0.1) 0%, rgba(13, 255, 153, 0.1) 100%)',
              padding: '20px',
              borderRadius: '16px',
              border: `2px solid ${darkMode ? 'rgba(217, 160, 13, 0.3)' : 'rgba(217, 160, 13, 0.2)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: `0 0 30px ${colors.gold}20`
            }}>
              <div style={{ fontSize: '11px', color: colors.text.tertiary, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Dados Exibidos
              </div>
              <div style={{
                fontSize: '36px',
                fontWeight: '900',
                background: colors.gradients.gold,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1
              }}>
                {filteredData.length}
              </div>
              <div style={{ fontSize: '11px', color: colors.text.tertiary, marginTop: '6px', fontWeight: '600' }}>
                {filteredData.filter(d => d.tipoRelatorio === 'Performance de Produtos').length} Performance · {filteredData.filter(d => d.tipoRelatorio === 'Time de Risco').length} Risco
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ==== DASHBOARD OVERVIEW ==== */}
        {activeDashboard === 'overview' && (
          <>
        {/* ==== KPI CARDS COM NEON ==== */}
        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
            <StatCard
              title="💰 GGR Médio"
              value={`R$ ${metrics.avgGGR.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
              trend={metrics.ggrTrend}
              sparklineData={metrics.sparklineData}
              icon="📈"
              gradient={colors.gradients.gold}
            />
            <StatCard
              title="📊 Margem de Lucro"
              value={metrics.margin.toFixed(1)}
              unit="%"
              trend={metrics.marginTrend}
              icon="💹"
              gradient={colors.gradients.lime}
            />
            <StatCard
              title="⚡ Volatilidade"
              value={`±${metrics.volatility.toLocaleString('pt-BR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`}
              icon="📉"
              gradient={colors.gradients.purple}
            />
            <StatCard
              title="✅ Status Backend"
              value={error ? 'Offline' : 'Online'}
              icon={error ? '🔴' : '🟢'}
              gradient={error ? colors.gradients.sunset : colors.gradients.blueGreen}
            />
          </div>
        )}

        {/* ==== GRÁFICOS ==== */}
        {!loading && filteredData.length > 0 && chartData.length > 0 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px', marginBottom: '32px' }}>

              {/* Area Chart */}
              <GlassCard hover={false} style={{ gridColumn: 'span 2' }}>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '20px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  background: colors.gradients.blueGreen,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  📈 Evolução GGR x NGR <span style={{ fontSize: '14px', fontWeight: 'normal', color: colors.text.tertiary }}>({chartData.length} pontos)</span>
                </h3>
                <ResponsiveContainer width="100%" height={420}>
                  <ComposedChart data={chartData}>
                    <defs>
                      <linearGradient id="colorGGRUltra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.gold} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={colors.gold} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorNGRUltra" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.lime} stopOpacity={0.6}/>
                        <stop offset="95%" stopColor={colors.lime} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval="preserveStartEnd"
                      stroke={colors.text.tertiary}
                      style={{ fontSize: '11px', fontWeight: '600' }}
                    />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px', fontWeight: '600' }} />
                    <Tooltip
                      contentStyle={{
                        background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                        borderRadius: '12px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
                        padding: '12px',
                        fontWeight: '600'
                      }}
                      labelStyle={{ color: colors.text.primary, marginBottom: '8px', fontWeight: '700' }}
                    />
                    <Legend wrapperStyle={{ fontWeight: '600' }} />
                    <Area
                      type="monotone"
                      dataKey="GGR"
                      stroke={colors.gold}
                      strokeWidth={4}
                      fill="url(#colorGGRUltra)"
                      name="GGR"
                      filter="drop-shadow(0 0 8px rgba(217, 160, 13, 0.6))"
                    />
                    <Line
                      type="monotone"
                      dataKey="NGR"
                      stroke={colors.lime}
                      strokeWidth={4}
                      name="NGR"
                      dot={{ r: 5, fill: colors.lime, strokeWidth: 2, stroke: darkMode ? colors.dark.primary : '#fff' }}
                      filter="drop-shadow(0 0 8px rgba(13, 255, 153, 0.8))"
                    />
                    {chartData.length > 20 && <Brush dataKey="label" height={40} stroke={colors.gold} fill={darkMode ? 'rgba(26, 29, 53, 0.6)' : 'rgba(255, 255, 255, 0.6)'} />}
                  </ComposedChart>
                </ResponsiveContainer>
              </GlassCard>

              {/* Gauges */}
              {metrics && (
                <>
                  <GaugeChart
                    title="Margem de Lucro"
                    value={metrics.margin}
                    max={100}
                    color={colors.lime}
                  />
                  <GaugeChart
                    title="Performance GGR"
                    value={Math.min((metrics.avgGGR / 1000) * 100, 100)}
                    max={100}
                    color={colors.gold}
                  />
                </>
              )}
            </div>

            {/* Cassino vs Sportsbook + Depósitos vs Saques */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '24px' }}>
              {produtosData && (
                <GlassCard hover={false}>
                  <h3 style={{
                    color: colors.text.primary,
                    fontSize: '20px',
                    fontWeight: '800',
                    marginBottom: '24px',
                    background: colors.gradients.purple,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    🎰 Cassino vs Sportsbook
                  </h3>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <defs>
                        <linearGradient id="cassinoGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#8b5cf6" />
                        </linearGradient>
                        <linearGradient id="sportsbookGradient" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor={colors.lime} />
                          <stop offset="100%" stopColor={colors.limeDark} />
                        </linearGradient>
                      </defs>
                      <Pie
                        data={[
                          { name: 'Cassino', value: produtosData.cassino.value, fill: 'url(#cassinoGradient)' },
                          { name: 'Sportsbook', value: produtosData.sportsbook.value, fill: 'url(#sportsbookGradient)' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={90}
                        outerRadius={130}
                        dataKey="value"
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{ stroke: colors.text.tertiary, strokeWidth: 2 }}
                      />
                      <Tooltip
                        contentStyle={{
                          background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                          border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                          borderRadius: '12px',
                          backdropFilter: 'blur(20px)',
                          padding: '12px',
                          fontWeight: '600'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '24px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: colors.text.tertiary, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Cassino</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: '#a855f7', textShadow: '0 0 15px rgba(168, 85, 247, 0.6)' }}>
                        {produtosData.cassino.percent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '13px', color: colors.text.tertiary, marginTop: '4px', fontWeight: '600' }}>
                        R$ {produtosData.cassino.value.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: colors.text.tertiary, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Sportsbook</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: colors.lime, textShadow: `0 0 15px ${colors.lime}60` }}>
                        {produtosData.sportsbook.percent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '13px', color: colors.text.tertiary, marginTop: '4px', fontWeight: '600' }}>
                        R$ {produtosData.sportsbook.value.toLocaleString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              )}

              {/* Depósitos vs Saques */}
              <GlassCard hover={false}>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '20px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  background: colors.gradients.blueGreen,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  💵 Depósitos x Saques
                </h3>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData}>
                    <defs>
                      <linearGradient id="depositosGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.lime} />
                        <stop offset="100%" stopColor={colors.limeDark} />
                      </linearGradient>
                      <linearGradient id="saquesGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.danger} />
                        <stop offset="100%" stopColor="#e11d48" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis
                      dataKey="label"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval="preserveStartEnd"
                      stroke={colors.text.tertiary}
                      style={{ fontSize: '11px', fontWeight: '600' }}
                    />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px', fontWeight: '600' }} />
                    <Tooltip
                      contentStyle={{
                        background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                        border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                        borderRadius: '12px',
                        backdropFilter: 'blur(20px)',
                        padding: '12px',
                        fontWeight: '600'
                      }}
                    />
                    <Legend wrapperStyle={{ fontWeight: '600' }} />
                    <Bar
                      dataKey="Depositos"
                      fill="url(#depositosGradient)"
                      name="Depósitos"
                      radius={[12, 12, 0, 0]}
                      filter="drop-shadow(0 0 8px rgba(13, 255, 153, 0.5))"
                    />
                    <Bar
                      dataKey="Saques"
                      fill="url(#saquesGradient)"
                      name="Saques"
                      radius={[12, 12, 0, 0]}
                      filter="drop-shadow(0 0 8px rgba(255, 71, 87, 0.5))"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </>
        )}
          </>
        )}

        {/* ==== DASHBOARD BÔNUS ==== */}
        {activeDashboard === 'bonus' && bonusData && (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              🎁 Dashboard de Bônus
            </h2>

            {/* KPI Cards Bônus */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <StatCard
                title="🎁 Total Concedido"
                value={`R$ ${bonusData.totalConcedidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                icon="💰"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="✅ Total Convertido"
                value={`R$ ${bonusData.totalConvertidos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                icon="💸"
                gradient={colors.gradients.lime}
              />
              <StatCard
                title="📊 Taxa de Conversão"
                value={bonusData.avgTaxaConversao.toFixed(1)}
                unit="%"
                icon="📈"
                gradient={colors.gradients.purple}
              />
              <StatCard
                title="💲 Custo Total"
                value={`R$ ${bonusData.totalCusto.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`}
                icon="💳"
                gradient={colors.gradients.blueGreen}
              />
            </div>

            {/* Gráficos de Bônus */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', marginBottom: '40px' }}>
              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  background: colors.gradients.gold,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  📊 Bônus Concedidos vs Convertidos
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={bonusData.chartData}>
                    <defs>
                      <linearGradient id="concedidosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.gold} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={colors.gold} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="convertidosGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.lime} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={colors.lime} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Area type="monotone" dataKey="Concedidos" stroke={colors.gold} fill="url(#concedidosGrad)" strokeWidth={3} />
                    <Area type="monotone" dataKey="Convertidos" stroke={colors.lime} fill="url(#convertidosGrad)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  background: colors.gradients.purple,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  📈 Taxa de Conversão ao Longo do Tempo
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={bonusData.chartData}>
                    <defs>
                      <linearGradient id="taxaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.purple} />
                        <stop offset="100%" stopColor={colors.cyan} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="label" angle={-45} textAnchor="end" height={80} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Line type="monotone" dataKey="Taxa" stroke="url(#taxaGrad)" strokeWidth={4} dot={{ r: 6, fill: colors.purple }} name="Taxa de Conversão (%)" />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </>
        )}

        {/* ==== DASHBOARD PRODUTOS ==== */}
        {activeDashboard === 'produtos' && produtosData && (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              🎰 Dashboard de Produtos
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '40px' }}>
              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  textAlign: 'center',
                  background: colors.gradients.lime,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  🎰 Cassino
                </h3>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: '900',
                    background: colors.gradients.gold,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    R$ {produtosData.cassino.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ color: colors.text.secondary, fontSize: '14px', marginTop: '8px' }}>
                    {produtosData.cassino.percent.toFixed(1)}% do total
                  </div>
                </div>
                <GaugeChart value={produtosData.cassino.percent} max={100} title="Share" color={colors.gold} />
              </GlassCard>

              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  textAlign: 'center',
                  background: colors.gradients.purple,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  ⚽ Sportsbook
                </h3>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{
                    fontSize: '48px',
                    fontWeight: '900',
                    background: colors.gradients.purple,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text'
                  }}>
                    R$ {produtosData.sportsbook.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div style={{ color: colors.text.secondary, fontSize: '14px', marginTop: '8px' }}>
                    {produtosData.sportsbook.percent.toFixed(1)}% do total
                  </div>
                </div>
                <GaugeChart value={produtosData.sportsbook.percent} max={100} title="Share" color={colors.purple} />
              </GlassCard>
            </div>
          </>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: colors.text.secondary }}>
            <div style={{
              fontSize: '64px',
              marginBottom: '24px',
              filter: `drop-shadow(0 0 20px ${colors.gold})`
            }}>⏳</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: colors.text.primary }}>Carregando dados...</div>
          </div>
        )}

        {!loading && filteredData.length === 0 && (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: colors.text.secondary }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
              filter: `drop-shadow(0 0 25px ${colors.gold})`
            }}>📊</div>
            <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: colors.text.primary }}>Nenhum dado disponível</div>
            <div style={{ fontSize: '16px', color: colors.text.tertiary }}>Aguardando mensagens do Slack...</div>
          </div>
        )}

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '60px',
          padding: '32px',
          color: colors.text.tertiary,
          fontSize: '13px',
          borderTop: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
          fontWeight: '600',
          letterSpacing: '0.5px'
        }}>
          <p style={{ margin: 0 }}>
            <span style={{
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '800'
            }}>
              Dashboard v5.1 Ultra
            </span>
            {' · '}
            {filteredData.length} de {data.length} períodos
            {' · '}
            {loading ? 'Carregando...' : autoRefresh ? <span style={{ color: colors.lime }}>🟢 Auto-refresh ativo</span> : '⏸️ Pausado'}
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(30px, -30px) rotate(5deg); }
          66% { transform: translate(-20px, 20px) rotate(-5deg); }
        }
      `}</style>
    </div>
  );
};

export default App;
