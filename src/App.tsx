import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Users, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';

const SlackAlertsDashboard = () => {
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
      const response = await fetch(`${API_URL}/api/data`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdate(new Date());
        console.log('✅ Dados carregados:', result.data.length, 'registros');
      } else {
        setError('Erro ao carregar dados');
      }
    } catch (err) {
      setError(`Não foi possível conectar ao backend. Certifique-se de que o servidor está rodando em ${API_URL}`);
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar novas mensagens do Slack
  const fetchNewMessages = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/fetch-messages`);
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Mensagens processadas:', result.count);
        // Recarregar dados após buscar novas mensagens
        await loadData();
      } else {
        setError('Erro ao buscar mensagens do Slack');
      }
    } catch (err) {
      setError('Erro ao conectar com o backend');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados ao iniciar
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        console.log('🔄 Auto-refresh: buscando novos dados...');
        loadData();
      }, 60000); // A cada 1 minuto
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Filtrar dados baseado no modo de visualização
  const getFilteredData = () => {
    if (!data || data.length === 0) return [];
    
    if (viewMode === 'today') {
      const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return data.filter(d => d.data === today);
    }
    return data;
  };

  const filteredData = getFilteredData();
  const latestData = filteredData[filteredData.length - 1] || {};
  const previousData = filteredData[filteredData.length - 2] || {};

  // Calcular variação percentual
  const calcVariation = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return (((current - previous) / previous) * 100).toFixed(2);
  };

  const StatCard = ({ title, value, icon: Icon, variation, prefix = 'R$' }) => {
    const isPositive = parseFloat(variation) >= 0;
    
    return (
      <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className="text-2xl font-bold text-gray-900">
              {value ? `${prefix}${value.toLocaleString('pt-BR')}` : '--'}
            </p>
            {variation !== undefined && (
              <div className="flex items-center mt-2">
                {isPositive ? (
                  <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                )}
                <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {variation}%
                </span>
                <span className="text-xs text-gray-500 ml-1">vs anterior</span>
              </div>
            )}
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <Icon className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    );
  };

  const formatCurrency = (value) => {
    return `R$${value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Financeiro - Slack</h1>
          <p className="text-gray-600">Monitoramento em tempo real dos alertas</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Erro de Conexão</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('today')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'today'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  viewMode === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Histórico
              </button>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={loadData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar Dados
              </button>
              
              <button
                onClick={fetchNewMessages}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition disabled:opacity-50"
              >
                📥 Buscar do Slack
              </button>
              
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  autoRefresh
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {autoRefresh ? '⏸️ Pausar Auto-Refresh' : '▶️ Auto-Refresh'}
              </button>
            </div>
          </div>
          
          <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
            <span>Total de registros: {filteredData.length}</span>
            {lastUpdate && (
              <span>Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}</span>
            )}
          </div>
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum dado encontrado</h3>
            <p className="text-gray-600 mb-4">
              Clique em "Buscar do Slack" para importar os alertas do seu canal
            </p>
            <button
              onClick={fetchNewMessages}
              disabled={loading}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
            >
              📥 Buscar Mensagens do Slack
            </button>
          </div>
        )}

        {/* Stats Cards */}
        {filteredData.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="GGR Total"
                value={latestData.ggr}
                icon={DollarSign}
                variation={calcVariation(latestData.ggr, previousData.ggr)}
              />
              <StatCard
                title="NGR Total"
                value={latestData.ngr}
                icon={DollarSign}
                variation={calcVariation(latestData.ngr, previousData.ngr)}
              />
              <StatCard
                title="Net/Profit"
                value={latestData.netProfit}
                icon={TrendingUp}
                variation={calcVariation(latestData.netProfit, previousData.netProfit)}
              />
              <StatCard
                title="Jogadores Cassino"
                value={latestData.jogadoresCassino}
                icon={Users}
                variation={calcVariation(latestData.jogadoresCassino, previousData.jogadoresCassino)}
                prefix=""
              />
            </div>

            {/* Charts */}
            <div className="space-y-6">
              {/* GGR e NGR */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Receita (GGR e NGR)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewMode === 'today' ? 'hora' : 'data'} />
                    <YAxis tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="ggr" stroke="#3b82f6" name="GGR" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ngr" stroke="#10b981" name="NGR" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Depósitos vs Saques */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Depósitos vs Saques</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewMode === 'today' ? 'hora' : 'data'} />
                    <YAxis tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="depositos" stroke="#10b981" name="Depósitos" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="saques" stroke="#ef4444" name="Saques" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="netProfit" stroke="#8b5cf6" name="Net/Profit" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Jogadores */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Jogadores Ativos</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewMode === 'today' ? 'hora' : 'data'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="jogadoresCassino" stroke="#f59e0b" name="Cassino" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="jogadoresSportsbook" stroke="#06b6d4" name="Sportsbook" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Onboarding */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Onboarding (Cadastros e KYC)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewMode === 'today' ? 'hora' : 'data'} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="cadastros" stroke="#ec4899" name="Cadastros" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="kyc" stroke="#8b5cf6" name="KYC" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Ticket Médio */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Ticket Médio por Jogador (Cassino)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={viewMode === 'today' ? 'hora' : 'data'} />
                    <YAxis tickFormatter={(value) => `R$${value.toFixed(0)}`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="ticketMedioCassino" stroke="#14b8a6" name="Ticket Médio" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {/* Footer Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>💡 Dashboard Integrado com Slack:</strong> Este dashboard está conectado ao seu backend Node.js que busca mensagens do Slack automaticamente.
          </p>
          <p className="text-xs text-blue-700 mt-2">
            {filteredData.length > 0 && latestData.horarioRelatorio && (
              <>Último relatório: {latestData.horarioRelatorio} | </>
            )}
            Status: {loading ? '🔄 Carregando...' : autoRefresh ? '✅ Auto-refresh ativo' : '⏸️ Pausado'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SlackAlertsDashboard;