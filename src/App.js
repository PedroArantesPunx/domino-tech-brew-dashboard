import React, { useState, useEffect } from 'react';

const App = () => {
  const [viewMode, setViewMode] = useState('today');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // URL do backend - ALTERE se necessário
  const API_URL = 'http://localhost:3001';

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
      setData(result.data);
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
            { title: 'Total de Alertas', value: '0', color: '#3b82f6' },
            { title: 'Alertas Hoje', value: '0', color: '#10b981' },
            { title: 'Status Backend', value: error ? 'Desconectado' : 'Conectado', color: error ? '#ef4444' : '#10b981' },
            { title: 'Última Atualização', value: lastUpdate || 'Nunca', color: '#6b7280' }
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
            Dados do Dashboard
          </h2>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              🔄 Carregando dados...
            </div>
          ) : data.length > 0 ? (
            <div style={{ color: '#6b7280' }}>
              <p>Dados carregados: {data.length} itens</p>
              <pre style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '6px',
                overflow: 'auto',
                fontSize: '12px'
              }}>
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              📊 Aguardando dados do backend...
              <br />
              <small>Configure o backend Slack para ver os alertas aqui</small>
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