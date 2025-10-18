import React, { useState, useEffect } from 'react';

const App = () => {
  const [viewMode, setViewMode] = useState('today');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // URL do backend - funciona tanto local quanto via proxy do nginx
  const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '/api';

  // State para estatísticas
  const [stats, setStats] = useState({
    totalAlertas: 0,
    alertasHoje: 0,
    ultimoAlerta: null,
    ultimaAtualizacao: null
  });

  // Carregar dados do backend
  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/dashboard-data`);
      if (!response.ok) {
        throw new Error('Erro ao conectar com o backend');
      }
      const result = await response.json();
      setData(result.data || []);
      setStats(result.stats || {});
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } catch (err) {
      setError(err.message);
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000); // 30 segundos
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      fontFamily: 'Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1f2937',
            margin: 0
          }}>
            Dashboard Slack - Domino Tech & Brew
          </h1>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? '🔄 Carregando...' : '🔄 Atualizar'}
            </button>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (30s)
            </label>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 16px'
      }}>

        {/* Error Message */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            color: '#dc2626'
          }}>
            <strong>Erro:</strong> {error}
            <br />
            <small>Verifique se o backend está rodando em {API_URL}</small>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {[
            { title: 'Total de Alertas', value: stats.totalAlertas || '0', color: '#3b82f6' },
            { title: 'Alertas Hoje', value: stats.alertasHoje || '0', color: '#10b981' },
            { title: 'Status Backend', value: error ? 'Desconectado' : 'Conectado', color: error ? '#ef4444' : '#10b981' },
            { title: 'Última Atualização', value: lastUpdate || 'Aguardando...', color: '#6b7280' }
          ].map((stat, index) => (
            <div key={index} style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                color: '#6b7280',
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 0 8px 0'
              }}>
                {stat.title}
              </h3>
              <p style={{
                color: stat.color,
                fontSize: '24px',
                fontWeight: 'bold',
                margin: 0
              }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Dashboard Content */}
        <div style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            color: '#1f2937',
            fontSize: '20px',
            fontWeight: 'bold',
            marginBottom: '16px'
          }}>
            {data.length > 0 ? 'Últimos Relatórios Financeiros' : 'Dados do Dashboard'}
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              🔄 Carregando dados...
            </div>
          ) : data.length > 0 ? (
            <div>
              {/* Último alerta em destaque */}
              {stats.ultimoAlerta && (
                <div style={{
                  backgroundColor: '#f0f9ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{
                    color: '#1f2937',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    marginBottom: '12px'
                  }}>
                    📊 Último Relatório - {stats.ultimoAlerta.data} às {stats.ultimoAlerta.hora}
                  </h3>
                  <div>
                    <div style={{
                      display: 'inline-block',
                      backgroundColor: '#3b82f6',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      marginBottom: '12px'
                    }}>
                      {stats.ultimoAlerta.tipoRelatorio || 'Relatório'}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '16px'
                    }}>
                      {stats.ultimoAlerta.tipoRelatorio === 'Performance de Produtos' ? [
                        { label: 'GGR Total', value: stats.ultimoAlerta.ggr ? `R$ ${stats.ultimoAlerta.ggr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#3b82f6' },
                        { label: 'NGR Total', value: stats.ultimoAlerta.ngr ? `R$ ${stats.ultimoAlerta.ngr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#10b981' },
                        { label: 'Turnover Total', value: stats.ultimoAlerta.turnoverTotal ? `R$ ${stats.ultimoAlerta.turnoverTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#8b5cf6' },
                        { label: 'Cassino GGR', value: stats.ultimoAlerta.cassinoGGR ? `R$ ${stats.ultimoAlerta.cassinoGGR.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#f59e0b' },
                        { label: 'Cassino Turnover', value: stats.ultimoAlerta.cassinoTurnover ? `R$ ${stats.ultimoAlerta.cassinoTurnover.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#ec4899' },
                        { label: 'Sportsbook GGR', value: stats.ultimoAlerta.sportsbookGGR ? `R$ ${stats.ultimoAlerta.sportsbookGGR.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#14b8a6' },
                        { label: 'Sportsbook Turnover', value: stats.ultimoAlerta.sportsbookTurnover ? `R$ ${stats.ultimoAlerta.sportsbookTurnover.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#06b6d4' }
                      ] : [
                        { label: 'GGR', value: stats.ultimoAlerta.ggr ? `R$ ${stats.ultimoAlerta.ggr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#3b82f6' },
                        { label: 'NGR', value: stats.ultimoAlerta.ngr ? `R$ ${stats.ultimoAlerta.ngr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#10b981' },
                        { label: 'Depósitos', value: stats.ultimoAlerta.depositos ? `R$ ${stats.ultimoAlerta.depositos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#8b5cf6' },
                        { label: 'Saques', value: stats.ultimoAlerta.saques ? `R$ ${stats.ultimoAlerta.saques.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#ef4444' },
                        { label: 'Fluxo Líquido', value: stats.ultimoAlerta.fluxoLiquido ? `R$ ${stats.ultimoAlerta.fluxoLiquido.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : 'N/A', color: '#f59e0b' },
                        { label: 'Jogadores Únicos', value: stats.ultimoAlerta.jogadoresUnicos || 'N/A', color: '#06b6d4' },
                        { label: 'Apostadores', value: stats.ultimoAlerta.apostadores || 'N/A', color: '#ec4899' },
                        { label: 'Depositantes', value: stats.ultimoAlerta.depositantes || 'N/A', color: '#14b8a6' }
                      ].map((item, idx) => (
                        <div key={idx}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>{item.label}</div>
                          <div style={{ fontSize: '16px', fontWeight: 'bold', color: item.color }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tabela de histórico */}
              <div style={{ marginTop: '24px' }}>
                <h3 style={{
                  color: '#1f2937',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  marginBottom: '12px'
                }}>
                  📋 Histórico ({data.length} registros)
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Data</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Hora</th>
                        <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Tipo</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>GGR</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>NGR</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Depósitos</th>
                        <th style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#374151' }}>Turnover</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.slice().reverse().map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '12px', color: '#6b7280' }}>{item.data || '-'}</td>
                          <td style={{ padding: '12px', color: '#6b7280' }}>{item.hora || '-'}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              display: 'inline-block',
                              backgroundColor: item.tipoRelatorio === 'Performance de Produtos' ? '#dbeafe' : '#fef3c7',
                              color: item.tipoRelatorio === 'Performance de Produtos' ? '#1e40af' : '#92400e',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '500'
                            }}>
                              {item.tipoRelatorio === 'Performance de Produtos' ? 'Performance' : 'Risco'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                            {item.ggr ? `R$ ${item.ggr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                            {item.ngr ? `R$ ${item.ngr.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                            {item.depositos ? `R$ ${item.depositos.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                          </td>
                          <td style={{ padding: '12px', textAlign: 'right', color: '#1f2937', fontWeight: '500' }}>
                            {item.turnoverTotal ? `R$ ${item.turnoverTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              📊 Aguardando dados do backend...
              <br />
              <small>O backend está buscando mensagens do Slack automaticamente</small>
              <br />
              <small style={{ marginTop: '8px', display: 'block' }}>Ou clique em "Atualizar" para forçar uma busca</small>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          padding: '16px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            Status: {loading ? '🔄 Carregando...' : autoRefresh ? '✅ Auto-refresh ativo' : '⏸️ Pausado'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;