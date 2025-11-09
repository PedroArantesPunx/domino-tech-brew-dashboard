import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush,
  RadialBarChart, RadialBar, ComposedChart, Scatter
} from 'recharts';

import FingerprintJS from '@fingerprintjs/fingerprintjs-pro';

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const App = () => {
  // ==== ESTADO DE AUTENTICAÇÃO ====
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  // ==== ESTADO DE REGISTRO ====
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerFullName, setRegisterFullName] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [currentUser, setCurrentUser] = useState(null);

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [darkMode, setDarkMode] = useState(true); // Default dark

  const [periodFilter, setPeriodFilter] = useState('all');
  const [tipoFilter, setTipoFilter] = useState('all');
  const [activeDashboard, setActiveDashboard] = useState('performance'); // performance, risco, overview, anomalias, fingerprint
  const [anomaliesData, setAnomaliesData] = useState(null);
  const [dataQuality, setDataQuality] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);

  // ==== ESTADOS PARA FINGERPRINT ====
  const [fingerprintData, setFingerprintData] = useState([]);
  const [fingerprintStats, setFingerprintStats] = useState(null);
  const [fingerprintLoading, setFingerprintLoading] = useState(false);
  const [fingerprintError, setFingerprintError] = useState(null);

  // ==== ESTADOS PARA DASHBOARDS SEPARADOS ====
  const [performanceData, setPerformanceData] = useState(null);
  const [riscoData, setRiscoData] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [overviewData, setOverviewData] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const [performanceLoading, setPerformanceLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [riscoLoading, setRiscoLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [overviewLoading, setOverviewLoading] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [performanceError, setPerformanceError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [riscoError, setRiscoError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [overviewError, setOverviewError] = useState(null);

  // ==== ESTADOS PARA NOVOS DASHBOARDS (Saldo e Usuários) ====
  const [saldoData, setSaldoData] = useState(null);
  const [usuariosData, setUsuariosData] = useState(null);

  // eslint-disable-next-line no-unused-vars
  const [saldoLoading, setSaldoLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [usuariosLoading, setUsuariosLoading] = useState(false);

  // eslint-disable-next-line no-unused-vars
  const [saldoError, setSaldoError] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [usuariosError, setUsuariosError] = useState(null);

  // ==== ESTADOS PARA CONTROLES AVANÇADOS DE GRÁFICOS ====
  const [chartType, setChartType] = useState('line'); // line, bar, area, candle, scatter
  const [timeAggregation, setTimeAggregation] = useState('original'); // original, minutes, hours, days, weeks, months, years
  const [enabledMA, setEnabledMA] = useState({ sma: false, ema: false, wma: false, hma: false });
  const [maPeriod, setMaPeriod] = useState(7);
  const [showSecondaryAxis, setShowSecondaryAxis] = useState(false);

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

  // ==== FUNÇÃO DE FORMATAÇÃO DE VALORES MONETÁRIOS ====
  const formatCurrency = (value, decimals = 2) => {
    if (value === null || value === undefined || isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  };

  // ==== VERIFICAR AUTENTICAÇÃO AO CARREGAR ====
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userDataStr = localStorage.getItem('currentUser');

    if (token && userDataStr) {
      try {
        const userData = JSON.parse(userDataStr);
        setCurrentUser(userData);
      } catch (e) {
        console.error('Erro ao parsear dados do usuário:', e);
      }

      // Verificar se o token é válido
      fetch(`${API_BASE_URL}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          setCurrentUser(null);
        }
      })
      .catch(() => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setCurrentUser(null);
      });
    }
  }, []);

  // ==== FUNÇÃO DE LOGIN ====
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword
        })
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('authToken', data.token);

        // Armazenar dados do usuário
        const userData = {
          username: data.username,
          email: data.email,
          fullName: data.fullName,
          role: data.role
        };
        localStorage.setItem('currentUser', JSON.stringify(userData));
        setCurrentUser(userData);
        setIsAuthenticated(true);

        // ==== INTEGRAÇÃO FINGERPRINT.COM ====
        try {
          console.log('🔍 Obtendo configuração do Fingerprint...');

          // Buscar API Key do backend (seguro - não exposto no código)
          const configResponse = await fetch(`${API_BASE_URL}/api/fingerprint/config`, {
            headers: {
              'Authorization': `Bearer ${data.token}`
            }
          });

          if (!configResponse.ok) {
            throw new Error('Não foi possível obter configuração do Fingerprint');
          }

          const configData = await configResponse.json();

          console.log('🔍 Coletando dados do Fingerprint...');
          const fp = await FingerprintJS.load({
            apiKey: configData.apiKey,
            endpoint: 'https://fp.techandbrew.com.br'
          });
          const result = await fp.get({ extendedResult: true });

          const fingerprintData = {
            username: loginUsername,
            visitorId: result.visitorId,
            ipAddress: result.ip,
            ipLocation: result.ipLocation,
            os: result.os,
            osVersion: result.osVersion,
            browserName: result.browserName,
            browserVersion: result.browserVersion,
            device: result.device,
            confidence: result.confidence.score,
            // Sinais de segurança
            isVPN: result.vpn,
            isProxy: result.proxy,
            isTor: result.tor,
            isIncognito: result.incognito,
            isTampered: result.tampering,
          };

          console.log('✅ Dados do Fingerprint coletados:', fingerprintData);

          // Enviar para o backend
          await fetch(`${API_BASE_URL}/api/fingerprint`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify(fingerprintData)
          });
          console.log('🚀 Dados do Fingerprint enviados para o backend.');

        } catch (fpError) {
          console.error("❌ Erro ao coletar ou enviar dados do Fingerprint:", fpError);
        }
        // =====================================

        setLoginError('');
      } else {
        setLoginError(data.message || 'Usuário ou senha inválidos');
      }
    } catch (error) {
      setLoginError('Erro ao conectar com o servidor');
    } finally {
      setLoginLoading(false);
    }
  };

  // ==== FUNÇÃO DE LOGOUT ====
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
  };

  // ==== FUNÇÃO DE REGISTRO ====
  const handleRegister = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: registerUsername,
          password: registerPassword,
          email: registerEmail,
          fullName: registerFullName
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setRegisterSuccess('Cadastro realizado com sucesso! Você já pode fazer login.');
        console.log('✅ Usuário registrado:', data.user);

        // Limpar campos
        setRegisterUsername('');
        setRegisterPassword('');
        setRegisterEmail('');
        setRegisterFullName('');

        // Voltar para tela de login após 2 segundos
        setTimeout(() => {
          setShowRegister(false);
          setRegisterSuccess('');
        }, 2000);
      } else {
        setRegisterError(data.message || 'Erro ao realizar cadastro');
        console.error('❌ Erro no registro:', data.message);
      }
    } catch (error) {
      setRegisterError('Erro ao conectar com o servidor');
      console.error('❌ Erro na requisição de registro:', error);
    } finally {
      setRegisterLoading(false);
    }
  };

  // ==== FUNÇÕES DE MÉDIAS MÓVEIS ====
  const calculateSMA = React.useCallback((data, period, key = 'GGR') => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, item) => acc + (item[key] || 0), 0);
        result.push(sum / period);
      }
    }
    return result;
  }, []);

  const calculateEMA = React.useCallback((data, period, key = 'GGR') => {
    const result = [];
    const multiplier = 2 / (period + 1);
    let ema = null;

    for (let i = 0; i < data.length; i++) {
      const value = data[i][key] || 0;
      if (ema === null) {
        ema = value;
      } else {
        ema = (value - ema) * multiplier + ema;
      }
      result.push(i < period - 1 ? null : ema);
    }
    return result;
  }, []);

  const calculateWMA = React.useCallback((data, period, key = 'GGR') => {
    const result = [];
    const weightSum = (period * (period + 1)) / 2;

    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        let sum = 0;
        for (let j = 0; j < period; j++) {
          sum += (data[i - j][key] || 0) * (period - j);
        }
        result.push(sum / weightSum);
      }
    }
    return result;
  }, []);

  const calculateHMA = React.useCallback((data, period, key = 'GGR') => {
    const halfPeriod = Math.floor(period / 2);
    const sqrtPeriod = Math.floor(Math.sqrt(period));

    const wma1 = calculateWMA(data, halfPeriod, key);
    const wma2 = calculateWMA(data, period, key);

    const rawHMA = wma1.map((val1, idx) => {
      if (val1 === null || wma2[idx] === null) return null;
      return 2 * val1 - wma2[idx];
    });

    const hmaData = rawHMA.map((val, idx) => ({ [key]: val }));
    const finalHMA = calculateWMA(hmaData, sqrtPeriod, key);

    return finalHMA;
  }, [calculateWMA]);

  // ==== FUNÇÃO DE AGREGAÇÃO POR PERÍODO ====
  const aggregateDataByPeriod = (data, aggregationType) => {
    if (aggregationType === 'original' || !data || data.length === 0) return data;

    const grouped = {};

    data.forEach(item => {
      const date = new Date(item.timestamp);
      let key;

      switch (aggregationType) {
        case 'minutes':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getMinutes()}`;
          break;
        case 'hours':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'days':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'weeks':
          const weekNum = Math.floor(date.getDate() / 7);
          key = `${date.getFullYear()}-${date.getMonth()}-W${weekNum}`;
          break;
        case 'months':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
        case 'years':
          key = `${date.getFullYear()}`;
          break;
        default:
          key = item.timestamp;
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });

    return Object.keys(grouped).map(key => {
      const items = grouped[key];
      const avg = (field) => items.reduce((sum, item) => sum + (item[field] || 0), 0) / items.length;

      return {
        ...items[0],
        ggr: avg('ggr'),
        ngr: avg('ngr'),
        turnoverTotal: avg('turnoverTotal'),
        depositos: avg('depositos'),
        saques: avg('saques'),
        cassinoGGR: avg('cassinoGGR'),
        cassinoNGR: avg('cassinoNGR'),
        sportsbookGGR: avg('sportsbookGGR'),
        sportsbookNGR: avg('sportsbookNGR'),
        label: key
      };
    });
  };

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard-data`);
      if (!response.ok) throw new Error('Erro ao conectar com o backend');
      const result = await response.json();
      const dataArray = result.data || [];
      setData(dataArray);

      // Capturar timestamp do último registro (mais recente)
      if (dataArray.length > 0) {
        const latestRecord = dataArray[0];
        const timestamp = latestRecord.timestamp;
        const dataHora = `${latestRecord.data} às ${latestRecord.hora}`;
        const tipo = latestRecord.tipoRelatorio;

        setLastUpdate({
          timestamp: timestamp,
          formatted: dataHora,
          tipo: tipo,
          fetchedAt: new Date().toLocaleString('pt-BR')
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar dados de anomalias
  const loadAnomalies = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/anomalies`);
      if (!response.ok) return;
      const result = await response.json();
      setAnomaliesData(result);

      // Verificar anomalias CRITICAL para alertas
      if (result.anomalies && result.anomalies.CRITICAL && result.anomalies.CRITICAL.length > 0) {
        setCriticalAlerts(prev => {
          // Filtrar apenas novas anomalias que não existem nos alertas anteriores
          const newCriticalAlerts = result.anomalies.CRITICAL.filter(anomaly => {
            return !prev.some(alert =>
              alert.timestamp === anomaly.timestamp && alert.type === anomaly.type
            );
          });

          if (newCriticalAlerts.length > 0) {
            // Exibir alerta visual no console
            newCriticalAlerts.forEach(alert => {
              console.error('🚨 ALERTA CRITICAL:', alert.message, alert);
            });
            // Retornar novos alertas + anteriores (manter últimos 10)
            return [...newCriticalAlerts, ...prev].slice(0, 10);
          }

          // Sem alterações, retornar estado anterior
          return prev;
        });
      }
    } catch (err) {
      console.error('Erro ao buscar anomalias:', err);
    }
  }, []); // ✅ Sem dependências - função estável

  // Buscar qualidade de dados
  const loadDataQuality = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data-quality`);
      if (!response.ok) return;
      const result = await response.json();
      setDataQuality(result);
    } catch (err) {
      console.error('Erro ao buscar qualidade de dados:', err);
    }
  }, []);

  // ==== FUNÇÕES DE FINGERPRINT ====
  const loadFingerprintData = React.useCallback(async () => {
    setFingerprintLoading(true);
    setFingerprintError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/fingerprint/data`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Erro ao buscar dados de fingerprint');

      const result = await response.json();
      if (result.success) {
        setFingerprintData(result.data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar dados de fingerprint:', err);
      setFingerprintError(err.message);
    } finally {
      setFingerprintLoading(false);
    }
  }, []);

  const loadFingerprintStats = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/fingerprint/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) return;

      const result = await response.json();
      if (result.success) {
        setFingerprintStats(result.data);
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas de fingerprint:', err);
    }
  }, []);

  // ==== FUNÇÕES DE FETCH PARA DASHBOARDS SEPARADOS ====

  // Buscar dados de Performance de Produtos
  const loadPerformanceData = React.useCallback(async () => {
    setPerformanceLoading(true);
    setPerformanceError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard-performance`);
      if (!response.ok) throw new Error('Erro ao buscar dados de Performance');
      const result = await response.json();
      setPerformanceData(result);

      // Atualizar lastUpdate se houver dados
      if (result.data && result.data.length > 0) {
        const latestRecord = result.data[0];
        setLastUpdate({
          timestamp: latestRecord.timestamp,
          formatted: `${latestRecord.data} às ${latestRecord.hora}`,
          tipo: 'Performance de Produtos',
          fetchedAt: new Date().toLocaleString('pt-BR')
        });
      }
    } catch (err) {
      setPerformanceError(err.message);
      console.error('Erro ao buscar Performance:', err);
    } finally {
      setPerformanceLoading(false);
    }
  }, []);

  // Buscar dados de Time de Risco
  const loadRiscoData = React.useCallback(async () => {
    setRiscoLoading(true);
    setRiscoError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard-risco`);
      if (!response.ok) throw new Error('Erro ao buscar dados de Risco');
      const result = await response.json();
      setRiscoData(result);

      // Atualizar lastUpdate se houver dados
      if (result.data && result.data.length > 0) {
        const latestRecord = result.data[0];
        setLastUpdate({
          timestamp: latestRecord.timestamp,
          formatted: `${latestRecord.data} às ${latestRecord.hora}`,
          tipo: 'Time de Risco',
          fetchedAt: new Date().toLocaleString('pt-BR')
        });
      }
    } catch (err) {
      setRiscoError(err.message);
      console.error('Erro ao buscar Risco:', err);
    } finally {
      setRiscoLoading(false);
    }
  }, []);

  // Buscar dados de Overview (Geral)
  const loadOverviewData = React.useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard-overview`);
      if (!response.ok) throw new Error('Erro ao buscar dados de Overview');
      const result = await response.json();
      setOverviewData(result);
    } catch (err) {
      setOverviewError(err.message);
      console.error('Erro ao buscar Overview:', err);
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  // Buscar dados de Saldo (Fluxo de Caixa)
  const loadSaldoData = React.useCallback(async () => {
    setSaldoLoading(true);
    setSaldoError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/dashboard-saldo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar dados de Saldo');
      const result = await response.json();
      setSaldoData(result);
    } catch (err) {
      setSaldoError(err.message);
      console.error('Erro ao buscar Saldo:', err);
    } finally {
      setSaldoLoading(false);
    }
  }, []);

  // Buscar dados de Usuários (LTV & Comportamento)
  const loadUsuariosData = React.useCallback(async () => {
    setUsuariosLoading(true);
    setUsuariosError(null);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/dashboard-usuarios`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Erro ao buscar dados de Usuários');
      const result = await response.json();
      setUsuariosData(result);
    } catch (err) {
      setUsuariosError(err.message);
      console.error('Erro ao buscar Usuários:', err);
    } finally {
      setUsuariosLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { loadAnomalies(); loadDataQuality(); }, [loadAnomalies, loadDataQuality]);

  // Carregar dados dos dashboards separados na inicialização
  useEffect(() => {
    loadPerformanceData();
    loadRiscoData();
    loadOverviewData();
    loadSaldoData();
    loadUsuariosData();
  }, [loadPerformanceData, loadRiscoData, loadOverviewData, loadSaldoData, loadUsuariosData]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadData();
        loadAnomalies();
        loadDataQuality();
        loadPerformanceData();
        loadRiscoData();
        loadOverviewData();
        loadSaldoData();
        loadUsuariosData();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, loadData, loadAnomalies, loadDataQuality, loadPerformanceData, loadRiscoData, loadOverviewData, loadSaldoData, loadUsuariosData]);

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

    // Aplicar agregação por período
    const aggregatedData = aggregateDataByPeriod(filteredData, timeAggregation);

    const baseData = aggregatedData.map(item => ({
      label: timeAggregation === 'original' ? `${item.data} ${item.hora}` : item.label,
      GGR: item.ggr || 0,
      NGR: item.ngr || 0,
      Turnover: item.turnoverTotal || 0,
      Depositos: item.depositos || 0,
      Saques: item.saques || 0
    }));

    // Calcular médias móveis
    const smaValues = enabledMA.sma ? calculateSMA(baseData, maPeriod, 'GGR') : [];
    const emaValues = enabledMA.ema ? calculateEMA(baseData, maPeriod, 'GGR') : [];
    const wmaValues = enabledMA.wma ? calculateWMA(baseData, maPeriod, 'GGR') : [];
    const hmaValues = enabledMA.hma ? calculateHMA(baseData, maPeriod, 'GGR') : [];

    // Adicionar médias móveis aos dados
    return baseData.map((item, idx) => ({
      ...item,
      SMA: enabledMA.sma ? smaValues[idx] : null,
      EMA: enabledMA.ema ? emaValues[idx] : null,
      WMA: enabledMA.wma ? wmaValues[idx] : null,
      HMA: enabledMA.hma ? hmaValues[idx] : null
    }));
  }, [filteredData, timeAggregation, enabledMA, maPeriod, calculateSMA, calculateEMA, calculateWMA, calculateHMA]);

  const produtosData = useMemo(() => {
    // Usar performanceData.data ao invés de data (sistema antigo)
    const perfDataSource = performanceData?.data || [];
    if (perfDataSource.length === 0) return null;

    // Filtrar apenas dados de Performance de Produtos
    let perfData = perfDataSource.filter(item =>
      item.tipoRelatorio === 'Performance de Produtos' &&
      item.cassinoGGR &&
      item.sportsbookGGR
    );

    if (perfData.length === 0) return null;

    // Aplicar filtros de período nos dados de produtos
    if (periodFilter === 'today') {
      if (perfData.length > 0) {
        const lastDate = perfData[perfData.length - 1].data;
        perfData = perfData.filter(item => item.data === lastDate);
      }
    } else if (periodFilter === 'yesterday') {
      if (perfData.length > 0) {
        const uniqueDates = [...new Set(perfData.map(item => item.data))].sort();
        if (uniqueDates.length >= 2) {
          const yesterdayDate = uniqueDates[uniqueDates.length - 2];
          perfData = perfData.filter(item => item.data === yesterdayDate);
        }
      }
    } else if (periodFilter === 'last7days') {
      if (perfData.length > 0) {
        const uniqueDates = [...new Set(perfData.map(item => item.data))].sort();
        const last7Dates = uniqueDates.slice(-7);
        perfData = perfData.filter(item => last7Dates.includes(item.data));
      }
    } else if (periodFilter === 'last20') {
      perfData = perfData.slice(-20);
    } else if (periodFilter === 'last50') {
      perfData = perfData.slice(-50);
    } else if (periodFilter === 'last100') {
      perfData = perfData.slice(-100);
    }

    // Calcular totais agregados do período filtrado para Cassino
    const totalCassinoTurnover = perfData.reduce((sum, item) => sum + (item.cassinoTurnover || 0), 0);
    const totalCassinoGGR = perfData.reduce((sum, item) => sum + (item.cassinoGGR || 0), 0);
    const totalCassinoNGR = perfData.reduce((sum, item) => sum + (item.cassinoNGR || 0), 0);

    // Calcular totais agregados do período filtrado para Sportsbook
    const totalSportsbookTurnover = perfData.reduce((sum, item) => sum + (item.sportsbookTurnover || 0), 0);
    const totalSportsbookGGR = perfData.reduce((sum, item) => sum + (item.sportsbookGGR || 0), 0);
    const totalSportsbookNGR = perfData.reduce((sum, item) => sum + (item.sportsbookNGR || 0), 0);

    // Calcular totais gerais
    const totalTurnover = perfData.reduce((sum, item) => sum + (item.turnoverTotal || 0), 0);
    const totalGGR = perfData.reduce((sum, item) => sum + (item.ggr || 0), 0);
    const totalNGR = perfData.reduce((sum, item) => sum + (item.ngr || 0), 0);

    // Calcular percentuais (baseado em GGR)
    const ggrTotal = totalCassinoGGR + totalSportsbookGGR;

    return {
      cassino: {
        turnover: totalCassinoTurnover,
        ggr: totalCassinoGGR,
        ngr: totalCassinoNGR,
        percent: ggrTotal > 0 ? (totalCassinoGGR / ggrTotal) * 100 : 0
      },
      sportsbook: {
        turnover: totalSportsbookTurnover,
        ggr: totalSportsbookGGR,
        ngr: totalSportsbookNGR,
        percent: ggrTotal > 0 ? (totalSportsbookGGR / ggrTotal) * 100 : 0
      },
      totalGeral: {
        turnover: totalTurnover,
        ggr: totalGGR,
        ngr: totalNGR
      },
      count: perfData.length
    };
  }, [performanceData, periodFilter]);

  const bonusData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Filtrar apenas dados de Time de Risco
    let bonusItems = data.filter(item =>
      item.tipoRelatorio === 'Time de Risco' &&
      item.bonusConcedidos !== null &&
      item.bonusConcedidos !== undefined
    );

    if (bonusItems.length === 0) return null;

    // Aplicar filtros de período nos dados de bônus
    if (periodFilter === 'today') {
      if (bonusItems.length > 0) {
        const lastDate = bonusItems[bonusItems.length - 1].data;
        bonusItems = bonusItems.filter(item => item.data === lastDate);
      }
    } else if (periodFilter === 'yesterday') {
      if (bonusItems.length > 0) {
        const uniqueDates = [...new Set(bonusItems.map(item => item.data))].sort();
        if (uniqueDates.length >= 2) {
          const yesterdayDate = uniqueDates[uniqueDates.length - 2];
          bonusItems = bonusItems.filter(item => item.data === yesterdayDate);
        }
      }
    } else if (periodFilter === 'last7days') {
      if (bonusItems.length > 0) {
        const uniqueDates = [...new Set(bonusItems.map(item => item.data))].sort();
        const last7Dates = uniqueDates.slice(-7);
        bonusItems = bonusItems.filter(item => last7Dates.includes(item.data));
      }
    } else if (periodFilter === 'last20') {
      bonusItems = bonusItems.slice(-20);
    } else if (periodFilter === 'last50') {
      bonusItems = bonusItems.slice(-50);
    } else if (periodFilter === 'last100') {
      bonusItems = bonusItems.slice(-100);
    }

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
  }, [data, periodFilter]);

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

  // Custom Tooltip com informações de tempo precisas
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;

    return (
      <div style={{
        background: darkMode
          ? 'linear-gradient(135deg, rgba(26, 29, 53, 0.98) 0%, rgba(10, 14, 39, 0.98) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%)',
        border: `2px solid ${darkMode ? 'rgba(217, 160, 13, 0.4)' : 'rgba(217, 160, 13, 0.3)'}`,
        borderRadius: '12px',
        padding: '16px',
        boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px ${colors.gold}40`,
        backdropFilter: 'blur(20px)',
        minWidth: '280px'
      }}>
        {/* Cabeçalho com data e hora */}
        <div style={{
          marginBottom: '12px',
          paddingBottom: '12px',
          borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '800',
            color: colors.gold,
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>📅</span>
            <span>{data.data || label}</span>
          </div>
          <div style={{
            fontSize: '13px',
            color: colors.text.secondary,
            fontWeight: '600',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🕐</span>
              <span>{data.hora}</span>
            </span>
            <span style={{
              fontSize: '11px',
              background: darkMode ? 'rgba(13, 255, 153, 0.2)' : 'rgba(13, 255, 153, 0.15)',
              color: colors.lime,
              padding: '3px 8px',
              borderRadius: '6px',
              fontWeight: '700'
            }}>
              {data.tipoRelatorio === 'Performance de Produtos' ? '⏱️ 15min' : '⏱️ 1h'}
            </span>
          </div>
          {data.tipoRelatorio && (
            <div style={{
              fontSize: '11px',
              color: colors.text.tertiary,
              marginTop: '4px',
              fontWeight: '600'
            }}>
              {data.tipoRelatorio === 'Performance de Produtos' ? '🎰 Performance de Produtos' : '⚠️ Time de Risco'}
            </div>
          )}
        </div>

        {/* Valores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {payload.map((entry, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 8px',
              background: darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderRadius: '8px',
              borderLeft: `3px solid ${entry.color}`
            }}>
              <span style={{
                fontSize: '12px',
                color: colors.text.secondary,
                fontWeight: '600'
              }}>
                {entry.name}:
              </span>
              <span style={{
                fontSize: '13px',
                color: colors.text.primary,
                fontWeight: '800'
              }}>
                {typeof entry.value === 'number'
                  ? entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ==== SE NÃO AUTENTICADO, MOSTRAR TELA DE LOGIN ====
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: `radial-gradient(ellipse at top, ${colors.dark.tertiary} 0%, ${colors.dark.primary} 50%, ${colors.dark.secondary} 100%)`,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Efeitos de fundo decorativos */}
        <div style={{
          position: 'absolute',
          top: '-30%',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: colors.gradients.gold,
          borderRadius: '50%',
          filter: 'blur(150px)',
          opacity: 0.15,
          zIndex: 0,
          animation: 'float 20s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-5%',
          width: '500px',
          height: '500px',
          background: colors.gradients.lime,
          borderRadius: '50%',
          filter: 'blur(120px)',
          opacity: 0.12,
          zIndex: 0,
          animation: 'float 25s ease-in-out infinite reverse'
        }} />

        {/* Container do Login */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          maxWidth: '420px',
          padding: '0 20px'
        }}>
          {/* Card de Login */}
          <div style={{
            background: 'rgba(26, 29, 53, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '48px 40px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 80px rgba(217, 160, 13, 0.15)`
          }}>
            {/* Logo/Título */}
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={{
                fontSize: '56px',
                marginBottom: '16px',
                filter: `drop-shadow(0 0 30px ${colors.gold})`
              }}>🎰</div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '800',
                background: colors.gradients.gold,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                marginBottom: '8px'
              }}>
                Domino Tech & Brew
              </h1>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: colors.text.secondary,
                fontWeight: '600'
              }}>
                Dashboard de Monitoramento Financeiro
              </p>
            </div>

            {/* Formulário - Login ou Registro */}
            {!showRegister ? (
            <form onSubmit={handleLogin}>
              {/* Campo Usuário */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Usuário
                </label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'rgba(10, 14, 39, 0.6)',
                    border: `2px solid ${loginError ? colors.danger : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    color: colors.text.primary,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.border = `2px solid ${colors.gold}`}
                  onBlur={(e) => e.target.style.border = `2px solid ${loginError ? colors.danger : 'rgba(255, 255, 255, 0.1)'}`}
                />
              </div>

              {/* Campo Senha */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  disabled={loginLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'rgba(10, 14, 39, 0.6)',
                    border: `2px solid ${loginError ? colors.danger : 'rgba(255, 255, 255, 0.1)'}`,
                    borderRadius: '12px',
                    color: colors.text.primary,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.border = `2px solid ${colors.gold}`}
                  onBlur={(e) => e.target.style.border = `2px solid ${loginError ? colors.danger : 'rgba(255, 255, 255, 0.1)'}`}
                />
              </div>

              {/* Mensagem de Erro */}
              {loginError && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '24px',
                  background: 'rgba(255, 71, 87, 0.1)',
                  border: `1px solid ${colors.danger}`,
                  borderRadius: '12px',
                  color: colors.danger,
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {loginError}
                </div>
              )}

              {/* Botão de Login */}
              <button
                type="submit"
                disabled={loginLoading || !loginUsername || !loginPassword}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '800',
                  background: loginLoading ? colors.text.tertiary : colors.gradients.gold,
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.dark.primary,
                  cursor: loginLoading || !loginUsername || !loginPassword ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: loginLoading ? 'none' : `0 8px 24px rgba(217, 160, 13, 0.3)`,
                  opacity: loginLoading || !loginUsername || !loginPassword ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loginLoading && loginUsername && loginPassword) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 32px rgba(217, 160, 13, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = loginLoading ? 'none' : '0 8px 24px rgba(217, 160, 13, 0.3)';
                }}
              >
                {loginLoading ? '⏳ Entrando...' : '🔓 Entrar'}
              </button>

              {/* Botão Criar Conta */}
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowRegister(true)}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${colors.gold}`,
                    borderRadius: '8px',
                    padding: '10px 20px',
                    color: colors.gold,
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(217, 160, 13, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'transparent';
                  }}
                >
                  📝 Criar Nova Conta
                </button>
              </div>
            </form>
            ) : (
            /* FORMULÁRIO DE REGISTRO */
            <form onSubmit={handleRegister}>
              <h2 style={{
                textAlign: 'center',
                color: colors.gold,
                marginBottom: '24px',
                fontSize: '22px',
                fontWeight: '800'
              }}>
                Criar Nova Conta
              </h2>

              {/* Mensagens */}
              {registerError && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  background: 'rgba(255, 71, 87, 0.1)',
                  border: `1px solid ${colors.danger}`,
                  borderRadius: '12px',
                  color: colors.danger,
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {registerError}
                </div>
              )}

              {registerSuccess && (
                <div style={{
                  padding: '12px 16px',
                  marginBottom: '16px',
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: `1px solid ${colors.success}`,
                  borderRadius: '12px',
                  color: colors.success,
                  fontSize: '14px',
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {registerSuccess}
                </div>
              )}

              {/* Nome Completo */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={registerFullName}
                  onChange={(e) => setRegisterFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  disabled={registerLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'rgba(10, 14, 39, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: colors.text.primary,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.border = `2px solid ${colors.gold}`}
                  onBlur={(e) => e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              {/* Username */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Username
                </label>
                <input
                  type="text"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder="3-20 caracteres (a-z, 0-9, _)"
                  required
                  minLength={3}
                  maxLength={20}
                  pattern="[a-zA-Z0-9_]+"
                  disabled={registerLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'rgba(10, 14, 39, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: colors.text.primary,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.border = `2px solid ${colors.gold}`}
                  onBlur={(e) => e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Email
                </label>
                <input
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={registerLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'rgba(10, 14, 39, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: colors.text.primary,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.border = `2px solid ${colors.gold}`}
                  onBlur={(e) => e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              {/* Senha */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.text.secondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Senha
                </label>
                <input
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  disabled={registerLoading}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    fontSize: '15px',
                    fontWeight: '600',
                    background: 'rgba(10, 14, 39, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    color: colors.text.primary,
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.border = `2px solid ${colors.gold}`}
                  onBlur={(e) => e.target.style.border = '2px solid rgba(255, 255, 255, 0.1)'}
                />
              </div>

              {/* Botão de Cadastro */}
              <button
                type="submit"
                disabled={registerLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '800',
                  background: registerLoading ? colors.text.tertiary : colors.gradients.gold,
                  border: 'none',
                  borderRadius: '12px',
                  color: colors.dark.primary,
                  cursor: registerLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: registerLoading ? 'none' : '0 8px 24px rgba(217, 160, 13, 0.3)',
                  opacity: registerLoading ? 0.5 : 1,
                  marginBottom: '12px'
                }}
                onMouseEnter={(e) => {
                  if (!registerLoading) {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 12px 32px rgba(217, 160, 13, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = registerLoading ? 'none' : '0 8px 24px rgba(217, 160, 13, 0.3)';
                }}
              >
                {registerLoading ? '⏳ Cadastrando...' : '✅ Criar Conta'}
              </button>

              {/* Botão Voltar */}
              <button
                type="button"
                onClick={() => {
                  setShowRegister(false);
                  setRegisterError('');
                  setRegisterSuccess('');
                }}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'transparent',
                  border: `1px solid ${colors.text.tertiary}`,
                  borderRadius: '8px',
                  color: colors.text.secondary,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = colors.text.secondary;
                  e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = colors.text.tertiary;
                  e.target.style.background = 'transparent';
                }}
              >
                ← Voltar para Login
              </button>
            </form>
            )}

            {/* Informação Adicional */}
            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              fontSize: '13px',
              color: colors.text.tertiary,
              fontWeight: '600'
            }}>
              <p style={{ margin: 0 }}>
                🔒 Acesso {showRegister ? 'para novos usuários' : 'restrito'}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            fontSize: '12px',
            color: colors.text.tertiary,
            fontWeight: '600'
          }}>
            Dashboard v5.1 Ultra · Domino Tech & Brew
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
  }

  // ==== DASHBOARD PRINCIPAL (SOMENTE SE AUTENTICADO) ====
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
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                <p style={{
                  fontSize: '13px',
                  color: colors.text.secondary,
                  margin: 0,
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  Domino Tech & Brew
                </p>
                {lastUpdate && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '8px 16px',
                    background: darkMode
                      ? 'linear-gradient(135deg, rgba(217, 160, 13, 0.15) 0%, rgba(13, 255, 153, 0.15) 100%)'
                      : 'linear-gradient(135deg, rgba(217, 160, 13, 0.1) 0%, rgba(13, 255, 153, 0.1) 100%)',
                    borderRadius: '10px',
                    border: `1px solid ${darkMode ? 'rgba(217, 160, 13, 0.3)' : 'rgba(217, 160, 13, 0.2)'}`,
                    backdropFilter: 'blur(10px)',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      fontSize: '20px',
                      filter: `drop-shadow(0 0 8px ${colors.gold})`
                    }}>
                      📡
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: colors.text.tertiary,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Última Atualização Slack
                      </span>
                      <span style={{
                        fontSize: '13px',
                        color: colors.text.primary,
                        fontWeight: '700'
                      }}>
                        {lastUpdate.formatted}
                      </span>
                    </div>
                    <div style={{
                      height: '32px',
                      width: '1px',
                      background: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: colors.text.tertiary,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Tipo
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: colors.text.primary,
                        fontWeight: '700'
                      }}>
                        {lastUpdate.tipo === 'Performance de Produtos' ? '🎰 Performance' : '⚠️ Risco'}
                      </span>
                    </div>
                    <div style={{
                      height: '32px',
                      width: '1px',
                      background: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)'
                    }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: colors.text.tertiary,
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Intervalo
                      </span>
                      <span style={{
                        fontSize: '12px',
                        color: colors.lime,
                        fontWeight: '700'
                      }}>
                        {lastUpdate.tipo === 'Performance de Produtos' ? '⏱️ 15min' : '⏱️ 1h'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
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
              <button
                onClick={handleLogout}
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.2) 0%, rgba(255, 71, 87, 0.1) 100%)',
                  color: colors.danger,
                  border: `2px solid ${colors.danger}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: `0 0 20px ${colors.danger}40`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                  e.currentTarget.style.boxShadow = `0 8px 30px ${colors.danger}60`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.danger}40`;
                }}
              >
                🚪 Sair
              </button>
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
            { id: 'performance', label: '🎰 Performance', icon: '🎰' },
            { id: 'risco', label: '⚠️ Time de Risco', icon: '⚠️' },
            { id: 'overview', label: '📈 Overview Geral', icon: '📈' },
            { id: 'saldo', label: '💰 Fluxo de Caixa', icon: '💰' },
            { id: 'usuarios', label: '👥 Análise de Usuários', icon: '👥' },
            { id: 'anomalias', label: '🚨 Anomalias', icon: '🛡️' },
            { id: 'fingerprint', label: '🔍 Fingerprint', icon: '🔒' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveDashboard(tab.id);
                // Carregar dados de fingerprint quando a aba for clicada
                if (tab.id === 'fingerprint') {
                  loadFingerprintData();
                  loadFingerprintStats();
                }
              }}
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

        {/* ==== CONTROLES AVANÇADOS DE GRÁFICOS ==== */}
        <GlassCard hover={false} style={{ marginBottom: '32px' }}>
          <h3 style={{
            color: colors.text.primary,
            fontSize: '18px',
            fontWeight: '800',
            marginBottom: '24px',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            background: colors.gradients.purple,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📊 Controles Avançados de Gráficos
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '24px' }}>
            {/* Tipo de Gráfico */}
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
                📈 Tipo de Visualização
              </label>
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
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
                  e.currentTarget.style.borderColor = colors.purple;
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.purple}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="line">📈 Linha</option>
                <option value="area">📊 Área</option>
                <option value="bar">📊 Barra</option>
                <option value="scatter">⚡ Scatter</option>
              </select>
            </div>

            {/* Agregação de Tempo */}
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
                ⏱️ Agregação de Tempo
              </label>
              <select
                value={timeAggregation}
                onChange={(e) => setTimeAggregation(e.target.value)}
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
                  e.currentTarget.style.borderColor = colors.cyan;
                  e.currentTarget.style.boxShadow = `0 0 20px ${colors.cyan}40`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <option value="original">⚡ Original</option>
                <option value="minutes">⏱️ Minutos</option>
                <option value="hours">🕐 Horas</option>
                <option value="days">📅 Dias</option>
                <option value="weeks">📆 Semanas</option>
                <option value="months">📊 Meses</option>
                <option value="years">📈 Anos</option>
              </select>
            </div>

            {/* Período de Média Móvel */}
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
                🔢 Período MA ({maPeriod})
              </label>
              <input
                type="range"
                min="3"
                max="50"
                value={maPeriod}
                onChange={(e) => setMaPeriod(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '8px',
                  borderRadius: '8px',
                  outline: 'none',
                  background: `linear-gradient(to right, ${colors.gold} 0%, ${colors.gold} ${((maPeriod - 3) / 47) * 100}%, ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} ${((maPeriod - 3) / 47) * 100}%, ${darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} 100%)`,
                  cursor: 'pointer',
                  accentColor: colors.gold
                }}
              />
              <div style={{ fontSize: '11px', color: colors.text.tertiary, marginTop: '8px', textAlign: 'center', fontWeight: '600' }}>
                3 ←→ 50 períodos
              </div>
            </div>

            {/* Toggle Eixo Secundário */}
            <div style={{
              background: darkMode
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)',
              padding: '20px',
              borderRadius: '16px',
              border: `2px solid ${darkMode ? 'rgba(168, 85, 247, 0.3)' : 'rgba(168, 85, 247, 0.2)'}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: `0 0 30px ${colors.purple}20`,
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onClick={() => setShowSecondaryAxis(!showSecondaryAxis)}
            >
              <div style={{ fontSize: '11px', color: colors.text.tertiary, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Eixo Secundário
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '900',
                lineHeight: 1
              }}>
                {showSecondaryAxis ? '✅' : '⬜'}
              </div>
              <div style={{ fontSize: '11px', color: colors.text.tertiary, marginTop: '6px', fontWeight: '600' }}>
                {showSecondaryAxis ? 'Ativado' : 'Desativado'}
              </div>
            </div>
          </div>

          {/* Médias Móveis */}
          <div style={{
            padding: '20px',
            borderRadius: '16px',
            border: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
            background: darkMode ? 'rgba(26, 29, 53, 0.4)' : 'rgba(255, 255, 255, 0.4)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '700',
              color: colors.text.secondary,
              marginBottom: '16px',
              textTransform: 'uppercase',
              letterSpacing: '1.2px'
            }}>
              📊 Médias Móveis
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              {[
                { key: 'sma', label: 'SMA (Simples)', color: colors.gold },
                { key: 'ema', label: 'EMA (Exponencial)', color: colors.lime },
                { key: 'wma', label: 'WMA (Ponderada)', color: colors.cyan },
                { key: 'hma', label: 'HMA (Hull)', color: colors.purple }
              ].map(ma => (
                <div
                  key={ma.key}
                  onClick={() => setEnabledMA({ ...enabledMA, [ma.key]: !enabledMA[ma.key] })}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border: `2px solid ${enabledMA[ma.key] ? ma.color : (darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)')}`,
                    background: enabledMA[ma.key]
                      ? `linear-gradient(135deg, ${ma.color}20 0%, ${ma.color}10 100%)`
                      : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textAlign: 'center',
                    boxShadow: enabledMA[ma.key] ? `0 0 20px ${ma.color}40` : 'none',
                    transform: enabledMA[ma.key] ? 'scale(1.05)' : 'scale(1)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = `0 0 20px ${ma.color}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = enabledMA[ma.key] ? 'scale(1.05)' : 'scale(1)';
                    e.currentTarget.style.boxShadow = enabledMA[ma.key] ? `0 0 20px ${ma.color}40` : 'none';
                  }}
                >
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>
                    {enabledMA[ma.key] ? '✅' : '⬜'}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    color: enabledMA[ma.key] ? ma.color : colors.text.secondary
                  }}>
                    {ma.label}
                  </div>
                </div>
              ))}
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
              value={formatCurrency(metrics.avgGGR)}
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
              value={`±${formatCurrency(metrics.volatility).replace('R$ ', '')}`}
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

              {/* Advanced Chart with Dynamic Configuration */}
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
                    <YAxis
                      yAxisId="left"
                      stroke={colors.text.tertiary}
                      style={{ fontSize: '12px', fontWeight: '600' }}
                      label={{ value: 'GGR / NGR', angle: -90, position: 'insideLeft', style: { fill: colors.text.secondary, fontWeight: '700' } }}
                    />
                    {showSecondaryAxis && (
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        stroke={colors.cyan}
                        style={{ fontSize: '12px', fontWeight: '600' }}
                        label={{ value: 'Turnover', angle: 90, position: 'insideRight', style: { fill: colors.cyan, fontWeight: '700' } }}
                      />
                    )}
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontWeight: '600' }} />

                    {/* GGR - Main Metric */}
                    {chartType === 'line' && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="GGR"
                        stroke={colors.gold}
                        strokeWidth={4}
                        name="GGR"
                        dot={{ r: 4, fill: colors.gold, strokeWidth: 2, stroke: darkMode ? colors.dark.primary : '#fff' }}
                        filter="drop-shadow(0 0 8px rgba(217, 160, 13, 0.6))"
                      />
                    )}
                    {chartType === 'area' && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="GGR"
                        stroke={colors.gold}
                        strokeWidth={4}
                        fill="url(#colorGGRUltra)"
                        name="GGR"
                        filter="drop-shadow(0 0 8px rgba(217, 160, 13, 0.6))"
                      />
                    )}
                    {chartType === 'bar' && (
                      <Bar
                        yAxisId="left"
                        dataKey="GGR"
                        fill={colors.gold}
                        name="GGR"
                        radius={[8, 8, 0, 0]}
                      />
                    )}
                    {chartType === 'scatter' && (
                      <Scatter
                        yAxisId="left"
                        dataKey="GGR"
                        fill={colors.gold}
                        name="GGR"
                        shape="circle"
                      />
                    )}

                    {/* NGR - Secondary Metric */}
                    {chartType === 'line' && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="NGR"
                        stroke={colors.lime}
                        strokeWidth={4}
                        name="NGR"
                        dot={{ r: 4, fill: colors.lime, strokeWidth: 2, stroke: darkMode ? colors.dark.primary : '#fff' }}
                        filter="drop-shadow(0 0 8px rgba(13, 255, 153, 0.8))"
                      />
                    )}
                    {chartType === 'area' && (
                      <Area
                        yAxisId="left"
                        type="monotone"
                        dataKey="NGR"
                        stroke={colors.lime}
                        strokeWidth={3}
                        fill="url(#colorNGRUltra)"
                        name="NGR"
                        filter="drop-shadow(0 0 8px rgba(13, 255, 153, 0.8))"
                      />
                    )}
                    {chartType === 'bar' && (
                      <Bar
                        yAxisId="left"
                        dataKey="NGR"
                        fill={colors.lime}
                        name="NGR"
                        radius={[8, 8, 0, 0]}
                      />
                    )}
                    {chartType === 'scatter' && (
                      <Scatter
                        yAxisId="left"
                        dataKey="NGR"
                        fill={colors.lime}
                        name="NGR"
                        shape="diamond"
                      />
                    )}

                    {/* Turnover on Secondary Axis */}
                    {showSecondaryAxis && chartType === 'line' && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Turnover"
                        stroke={colors.cyan}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Turnover"
                        dot={{ r: 3, fill: colors.cyan }}
                        filter="drop-shadow(0 0 6px rgba(0, 245, 255, 0.5))"
                      />
                    )}
                    {showSecondaryAxis && chartType === 'area' && (
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="Turnover"
                        stroke={colors.cyan}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Turnover"
                        filter="drop-shadow(0 0 6px rgba(0, 245, 255, 0.5))"
                      />
                    )}

                    {/* Moving Averages */}
                    {enabledMA.sma && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="SMA"
                        stroke={colors.gold}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        name={`SMA(${maPeriod})`}
                        dot={false}
                        opacity={0.7}
                      />
                    )}
                    {enabledMA.ema && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="EMA"
                        stroke={colors.lime}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        name={`EMA(${maPeriod})`}
                        dot={false}
                        opacity={0.7}
                      />
                    )}
                    {enabledMA.wma && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="WMA"
                        stroke={colors.cyan}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        name={`WMA(${maPeriod})`}
                        dot={false}
                        opacity={0.7}
                      />
                    )}
                    {enabledMA.hma && (
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="HMA"
                        stroke={colors.purple}
                        strokeWidth={2}
                        strokeDasharray="3 3"
                        name={`HMA(${maPeriod})`}
                        dot={false}
                        opacity={0.7}
                      />
                    )}

                    {/* Zoom & Pan with Brush */}
                    {chartData.length > 10 && <Brush
                      dataKey="label"
                      height={40}
                      stroke={colors.gold}
                      fill={darkMode ? 'rgba(26, 29, 53, 0.6)' : 'rgba(255, 255, 255, 0.6)'}
                      travellerWidth={10}
                    />}
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
                          { name: 'Cassino', value: produtosData.cassino.ggr, fill: 'url(#cassinoGradient)' },
                          { name: 'Sportsbook', value: produtosData.sportsbook.ggr, fill: 'url(#sportsbookGradient)' }
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
                        {formatCurrency(produtosData.cassino.ggr)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: colors.text.tertiary, marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Sportsbook</div>
                      <div style={{ fontSize: '28px', fontWeight: '900', color: colors.lime, textShadow: `0 0 15px ${colors.lime}60` }}>
                        {produtosData.sportsbook.percent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: '13px', color: colors.text.tertiary, marginTop: '4px', fontWeight: '600' }}>
                        {formatCurrency(produtosData.sportsbook.ggr)}
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

        {/* ==== DASHBOARD TIME DE RISCO ==== */}
        {activeDashboard === 'risco' && bonusData && (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              ⚠️ Dashboard Time de Risco
            </h2>
            {/* Info Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px'
            }}>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                border: `1px solid ${colors.purple}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.purple,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 {bonusData.count} períodos analisados
              </div>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                border: `1px solid ${colors.danger}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.danger,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⏱️ Intervalo: 1 hora
              </div>
              {riscoData?.stats?.ultimaAtualizacao && (
                <div style={{
                  padding: '8px 16px',
                  background: darkMode ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 245, 255, 0.1)',
                  border: `1px solid ${colors.cyan}`,
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.cyan,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🕐 Última atualização: {riscoData.stats.ultimaAtualizacao}
                </div>
              )}
            </div>

            {/* Seção Bônus */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: '800',
              background: colors.gradients.purple,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              🎁 Gestão de Bônus
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <StatCard
                title="🎁 Total Concedido"
                value={formatCurrency(bonusData.totalConcedidos)}
                icon="💰"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="✅ Total Convertido"
                value={formatCurrency(bonusData.totalConvertidos)}
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
                value={formatCurrency(bonusData.totalCusto)}
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

        {/* ==== DASHBOARD PERFORMANCE ==== */}
        {activeDashboard === 'performance' && produtosData && (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              🎰 Dashboard Performance de Produtos
            </h2>
            {/* Info Badge */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px'
            }}>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 255, 136, 0.1)',
                border: `1px solid ${colors.success}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.success,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 {produtosData.count} períodos analisados
              </div>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(217, 160, 13, 0.1)' : 'rgba(217, 160, 13, 0.1)',
                border: `1px solid ${colors.text.gold}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.text.gold,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⏱️ Intervalo: 15 minutos
              </div>
              {performanceData?.stats?.ultimaAtualizacao && (
                <div style={{
                  padding: '8px 16px',
                  background: darkMode ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 245, 255, 0.1)',
                  border: `1px solid ${colors.cyan}`,
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: colors.cyan,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  🕐 Última atualização: {performanceData.stats.ultimaAtualizacao}
                </div>
              )}
            </div>

            {/* ==== TOTAIS ACUMULADOS E VARIAÇÃO ==== */}
            {performanceData?.stats && (
              <>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  background: colors.gradients.gold,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '16px',
                  textAlign: 'center'
                }}>
                  📊 Totais Acumulados do Período
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                  <StatCard
                    title="🎰 Casino - Total GGR"
                    value={formatCurrency(performanceData.stats.totals?.cassinoGGR || 0)}
                    icon="💰"
                    gradient={colors.gradients.gold}
                  />
                  <StatCard
                    title="🎰 Casino - Total NGR"
                    value={formatCurrency(performanceData.stats.totals?.cassinoNGR || 0)}
                    icon="💎"
                    gradient={colors.gradients.lime}
                  />
                  <StatCard
                    title="⚽ Sportsbook - Total GGR"
                    value={formatCurrency(performanceData.stats.totals?.sportsbookGGR || 0)}
                    icon="💰"
                    gradient={colors.gradients.purple}
                  />
                  <StatCard
                    title="⚽ Sportsbook - Total NGR"
                    value={formatCurrency(performanceData.stats.totals?.sportsbookNGR || 0)}
                    icon="💎"
                    gradient={colors.gradients.blueGreen}
                  />
                </div>

                {/* Variação do Último Período */}
                {performanceData.stats.diff && (
                  <>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '800',
                      background: colors.gradients.blueGreen,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '16px',
                      textAlign: 'center'
                    }}>
                      📈 Variação do Último Período (Δ)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '48px' }}>
                      <StatCard
                        title="🎰 Casino - Δ GGR"
                        value={formatCurrency(Math.abs(performanceData.stats.diff.casino?.ggr || 0))}
                        icon={performanceData.stats.diff.casino?.ggr >= 0 ? '📈' : '📉'}
                        gradient={performanceData.stats.diff.casino?.ggr >= 0 ? colors.gradients.lime : colors.gradients.sunset}
                        trend={performanceData.stats.diff.casino?.ggr >= 0 ? 'up' : 'down'}
                      />
                      <StatCard
                        title="🎰 Casino - Δ NGR"
                        value={formatCurrency(Math.abs(performanceData.stats.diff.casino?.ngr || 0))}
                        icon={performanceData.stats.diff.casino?.ngr >= 0 ? '📈' : '📉'}
                        gradient={performanceData.stats.diff.casino?.ngr >= 0 ? colors.gradients.lime : colors.gradients.sunset}
                        trend={performanceData.stats.diff.casino?.ngr >= 0 ? 'up' : 'down'}
                      />
                      <StatCard
                        title="⚽ Sportsbook - Δ GGR"
                        value={formatCurrency(Math.abs(performanceData.stats.diff.sportsbook?.ggr || 0))}
                        icon={performanceData.stats.diff.sportsbook?.ggr >= 0 ? '📈' : '📉'}
                        gradient={performanceData.stats.diff.sportsbook?.ggr >= 0 ? colors.gradients.lime : colors.gradients.sunset}
                        trend={performanceData.stats.diff.sportsbook?.ggr >= 0 ? 'up' : 'down'}
                      />
                      <StatCard
                        title="⚽ Sportsbook - Δ NGR"
                        value={formatCurrency(Math.abs(performanceData.stats.diff.sportsbook?.ngr || 0))}
                        icon={performanceData.stats.diff.sportsbook?.ngr >= 0 ? '📈' : '📉'}
                        gradient={performanceData.stats.diff.sportsbook?.ngr >= 0 ? colors.gradients.lime : colors.gradients.sunset}
                        trend={performanceData.stats.diff.sportsbook?.ngr >= 0 ? 'up' : 'down'}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* ==== SEÇÃO CASSINO ==== */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: '800',
              background: colors.gradients.lime,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              🎰 Cassino
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              <StatCard
                title="💸 Turnover"
                value={formatCurrency(produtosData.cassino.turnover)}
                icon="🎲"
                gradient={colors.gradients.blueGreen}
              />
              <StatCard
                title="💰 Lucro Bruto (GGR)"
                value={formatCurrency(produtosData.cassino.ggr)}
                icon="📊"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="💎 Lucro Líquido (NGR)"
                value={formatCurrency(produtosData.cassino.ngr)}
                icon="💚"
                gradient={colors.gradients.lime}
              />
            </div>

            {/* ==== SEÇÃO SPORTSBOOK ==== */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: '800',
              background: colors.gradients.purple,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              ⚽ Sportsbook
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '48px' }}>
              <StatCard
                title="💸 Turnover"
                value={formatCurrency(produtosData.sportsbook.turnover)}
                icon="⚽"
                gradient={colors.gradients.blueGreen}
              />
              <StatCard
                title="💰 Lucro Bruto (GGR)"
                value={formatCurrency(produtosData.sportsbook.ggr)}
                icon="📊"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="💎 Lucro Líquido (NGR)"
                value={formatCurrency(produtosData.sportsbook.ngr)}
                icon="💜"
                gradient={colors.gradients.purple}
              />
            </div>

            {/* ==== SEÇÃO TOTAL GERAL ==== */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: '800',
              background: colors.gradients.sunset,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              📊 Total Geral
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <StatCard
                title="💸 Turnover Total"
                value={formatCurrency(produtosData.totalGeral.turnover)}
                icon="🌐"
                gradient={colors.gradients.blueGreen}
              />
              <StatCard
                title="💰 Lucro Bruto (GGR)"
                value={formatCurrency(produtosData.totalGeral.ggr)}
                icon="💵"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="💎 Lucro Líquido (NGR)"
                value={formatCurrency(produtosData.totalGeral.ngr)}
                icon="✨"
                gradient={colors.gradients.lime}
              />
            </div>

            {/* ==== COMPARAÇÃO CASSINO VS SPORTSBOOK ==== */}
            <h3 style={{
              fontSize: '24px',
              fontWeight: '800',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              textAlign: 'left'
            }}>
              📊 Comparação de Desempenho
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px', marginBottom: '40px' }}>
              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '16px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  textAlign: 'center',
                  background: colors.gradients.lime,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  🎰 Share Cassino
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
                    {produtosData.cassino.percent.toFixed(1)}%
                  </div>
                  <div style={{ color: colors.text.secondary, fontSize: '14px', marginTop: '8px' }}>
                    {formatCurrency(produtosData.cassino.ggr)}
                  </div>
                </div>
                <GaugeChart value={produtosData.cassino.percent} max={100} title="GGR Share" color={colors.gold} />
              </GlassCard>

              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '16px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  textAlign: 'center',
                  background: colors.gradients.purple,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  ⚽ Share Sportsbook
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
                    {produtosData.sportsbook.percent.toFixed(1)}%
                  </div>
                  <div style={{ color: colors.text.secondary, fontSize: '14px', marginTop: '8px' }}>
                    {formatCurrency(produtosData.sportsbook.ggr)}
                  </div>
                </div>
                <GaugeChart value={produtosData.sportsbook.percent} max={100} title="GGR Share" color={colors.purple} />
              </GlassCard>
            </div>
          </>
        )}

        {/* ==== DASHBOARD RISCO & QUALIDADE ==== */}
        {activeDashboard === 'anomalias' && (
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
              🚨 Monitoramento de Risco & Qualidade de Dados
            </h2>

            {/* ==== ALERTAS CRITICAL EM TEMPO REAL ==== */}
            {criticalAlerts.length > 0 && (
              <GlassCard style={{
                marginBottom: '32px',
                border: `3px solid ${colors.danger}`,
                background: darkMode
                  ? 'rgba(255, 71, 87, 0.15)'
                  : 'rgba(255, 71, 87, 0.08)',
                animation: 'pulse 2s infinite'
              }}>
                <h3 style={{
                  color: colors.danger,
                  fontSize: '20px',
                  fontWeight: '800',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '32px', filter: `drop-shadow(0 0 10px ${colors.danger})` }}>🚨</span>
                  Alertas Críticos Ativos ({criticalAlerts.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {criticalAlerts.slice(0, 5).map((alert, idx) => (
                    <div key={idx} style={{
                      padding: '16px',
                      background: darkMode ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 71, 87, 0.05)',
                      borderRadius: '12px',
                      borderLeft: `4px solid ${colors.danger}`
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px'
                      }}>
                        <span style={{
                          color: colors.text.primary,
                          fontWeight: '700',
                          fontSize: '15px'
                        }}>
                          {alert.message}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: colors.text.tertiary,
                          background: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: '700'
                        }}>
                          {new Date(alert.timestamp).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: colors.text.secondary,
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap'
                      }}>
                        <span>📍 {alert.tipoRelatorio || 'N/A'}</span>
                        <span>📅 {alert.data || 'N/A'}</span>
                        <span>🕐 {alert.hora || 'N/A'}</span>
                        {alert.ngr && <span>💰 NGR: {alert.ngr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                        {alert.ggr && <span>💎 GGR: {alert.ggr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* ==== MÉTRICAS DE QUALIDADE ==== */}
            {dataQuality && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                <StatCard
                  title="Score de Qualidade"
                  value={dataQuality.qualityScore || 0}
                  subtitle={dataQuality.qualityGrade || 'N/A'}
                  icon="⭐"
                  gradient={
                    dataQuality.qualityScore >= 90 ? colors.gradients.lime :
                    dataQuality.qualityScore >= 75 ? colors.gradients.gold :
                    dataQuality.qualityScore >= 50 ? 'linear-gradient(135deg, #FF9D00 0%, #FFB800 100%)' :
                    'linear-gradient(135deg, #FF4757 0%, #FF6B7A 100%)'
                  }
                />
                <StatCard
                  title="Total de Registros"
                  value={dataQuality.metrics?.totalRecords?.toLocaleString('pt-BR') || '0'}
                  subtitle="Processados"
                  icon="📊"
                  gradient={colors.gradients.gold}
                />
                <StatCard
                  title="Taxa de Anomalias"
                  value={dataQuality.metrics?.anomalyRate || '0%'}
                  subtitle={`${anomaliesData?.totalAnomalies || 0} detectadas`}
                  icon="⚠️"
                  gradient={colors.gradients.purple}
                />
                <StatCard
                  title="Registros com Deltas"
                  value={dataQuality.metrics?.deltaCalculationRate || '0%'}
                  subtitle="Calculados"
                  icon="📈"
                  gradient={colors.gradients.lime}
                />
              </div>
            )}

            {/* ==== ANOMALIAS POR SEVERIDADE ==== */}
            {anomaliesData && (
              <>
                <h3 style={{
                  fontSize: '22px',
                  fontWeight: '800',
                  background: colors.gradients.gold,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '24px',
                  textAlign: 'left'
                }}>
                  📊 Distribuição de Anomalias por Severidade
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
                  <GlassCard style={{ borderLeft: `4px solid #FF4757` }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔴</div>
                      <div style={{
                        fontSize: '42px',
                        fontWeight: '900',
                        color: '#FF4757',
                        marginBottom: '8px'
                      }}>
                        {anomaliesData.bySeverity?.CRITICAL || 0}
                      </div>
                      <div style={{
                        color: colors.text.secondary,
                        fontSize: '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        CRITICAL
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard style={{ borderLeft: `4px solid #FF6B00` }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🟠</div>
                      <div style={{
                        fontSize: '42px',
                        fontWeight: '900',
                        color: '#FF6B00',
                        marginBottom: '8px'
                      }}>
                        {anomaliesData.bySeverity?.HIGH || 0}
                      </div>
                      <div style={{
                        color: colors.text.secondary,
                        fontSize: '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        HIGH
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard style={{ borderLeft: `4px solid #FFB800` }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🟡</div>
                      <div style={{
                        fontSize: '42px',
                        fontWeight: '900',
                        color: '#FFB800',
                        marginBottom: '8px'
                      }}>
                        {anomaliesData.bySeverity?.MEDIUM || 0}
                      </div>
                      <div style={{
                        color: colors.text.secondary,
                        fontSize: '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        MEDIUM
                      </div>
                    </div>
                  </GlassCard>

                  <GlassCard style={{ borderLeft: `4px solid #0DFF99` }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🟢</div>
                      <div style={{
                        fontSize: '42px',
                        fontWeight: '900',
                        color: '#0DFF99',
                        marginBottom: '8px'
                      }}>
                        {anomaliesData.bySeverity?.LOW || 0}
                      </div>
                      <div style={{
                        color: colors.text.secondary,
                        fontSize: '14px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}>
                        LOW
                      </div>
                    </div>
                  </GlassCard>
                </div>

                {/* ==== DETALHAMENTO DE ANOMALIAS ==== */}
                {Object.entries(anomaliesData.anomalies || {}).map(([severity, alerts]) => {
                  if (!alerts || alerts.length === 0) return null;

                  const severityColors = {
                    CRITICAL: '#FF4757',
                    HIGH: '#FF6B00',
                    MEDIUM: '#FFB800',
                    LOW: '#0DFF99'
                  };

                  const severityIcons = {
                    CRITICAL: '🔴',
                    HIGH: '🟠',
                    MEDIUM: '🟡',
                    LOW: '🟢'
                  };

                  return (
                    <GlassCard key={severity} style={{ marginBottom: '24px' }}>
                      <h4 style={{
                        color: severityColors[severity],
                        fontSize: '18px',
                        fontWeight: '800',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <span style={{ fontSize: '24px' }}>{severityIcons[severity]}</span>
                        Anomalias {severity} ({alerts.length})
                      </h4>
                      <div style={{
                        maxHeight: severity === 'CRITICAL' ? 'none' : '400px',
                        overflowY: severity === 'CRITICAL' ? 'visible' : 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        {alerts.slice(0, severity === 'CRITICAL' ? alerts.length : 10).map((anomaly, idx) => (
                          <div key={idx} style={{
                            padding: '14px',
                            background: darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                            borderRadius: '10px',
                            borderLeft: `3px solid ${severityColors[severity]}`
                          }}>
                            <div style={{
                              color: colors.text.primary,
                              fontWeight: '600',
                              fontSize: '14px',
                              marginBottom: '8px'
                            }}>
                              {anomaly.message}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: colors.text.tertiary,
                              display: 'flex',
                              gap: '12px',
                              flexWrap: 'wrap'
                            }}>
                              <span>📍 {anomaly.tipoRelatorio || 'N/A'}</span>
                              <span>📅 {anomaly.data || 'N/A'} {anomaly.hora || ''}</span>
                              <span>⚙️ {anomaly.type || 'N/A'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {alerts.length > 10 && severity !== 'CRITICAL' && (
                        <div style={{
                          marginTop: '12px',
                          textAlign: 'center',
                          color: colors.text.tertiary,
                          fontSize: '13px',
                          fontWeight: '600'
                        }}>
                          + {alerts.length - 10} anomalias adicionais
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </>
            )}

            {/* ==== INTEGRIDADE DE DADOS ==== */}
            {dataQuality && dataQuality.metrics?.byType && (
              <GlassCard>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '800',
                  background: colors.gradients.lime,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '24px'
                }}>
                  🛡️ Integridade de Dados por Tipo de Relatório
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                  {Object.entries(dataQuality.metrics.byType).map(([tipo, metrics]) => (
                    <div key={tipo} style={{
                      padding: '20px',
                      background: darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                      borderRadius: '12px',
                      border: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`
                    }}>
                      <h4 style={{
                        color: colors.text.primary,
                        fontSize: '16px',
                        fontWeight: '800',
                        marginBottom: '16px'
                      }}>
                        {tipo === 'Performance de Produtos' ? '🎰' : '⚠️'} {tipo}
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: colors.text.secondary, fontSize: '14px' }}>Total de Registros:</span>
                          <span style={{ color: colors.text.primary, fontWeight: '700' }}>
                            {metrics.count?.toLocaleString('pt-BR') || 0}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: colors.text.secondary, fontSize: '14px' }}>Completude:</span>
                          <span style={{
                            color: parseFloat(metrics.completeness) >= 95 ? colors.lime : parseFloat(metrics.completeness) >= 80 ? colors.gold : colors.danger,
                            fontWeight: '700'
                          }}>
                            {metrics.completeness || 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: colors.text.secondary, fontSize: '14px' }}>Intervalo Médio:</span>
                          <span style={{ color: colors.text.primary, fontWeight: '700' }}>
                            {metrics.avgInterval || 'N/A'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: colors.text.secondary, fontSize: '14px' }}>Intervalo Esperado:</span>
                          <span style={{ color: colors.text.tertiary, fontWeight: '600' }}>
                            {metrics.expectedInterval || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Mensagem quando não há dados */}
            {!anomaliesData && !dataQuality && (
              <div style={{ textAlign: 'center', padding: '100px 20px', color: colors.text.secondary }}>
                <div style={{
                  fontSize: '80px',
                  marginBottom: '24px',
                  filter: `drop-shadow(0 0 25px ${colors.gold})`
                }}>🛡️</div>
                <div style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px', color: colors.text.primary }}>
                  Carregando dados de qualidade...
                </div>
                <div style={{ fontSize: '16px', color: colors.text.tertiary }}>
                  Aguarde enquanto processamos as informações
                </div>
              </div>
            )}
          </>
        )}
        {/* ==== DASHBOARD FLUXO DE CAIXA (SALDO) ==== */}
        {activeDashboard === 'saldo' && saldoData && saldoData.stats && (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              💰 Dashboard de Fluxo de Caixa
            </h2>

            {/* Info Badges */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px'
            }}>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(217, 160, 13, 0.1)' : 'rgba(217, 160, 13, 0.1)',
                border: `1px solid ${colors.gold}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.gold,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 {saldoData.count} registros de saldo
              </div>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 245, 255, 0.1)',
                border: `1px solid ${colors.cyan}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.cyan
              }}>
                🕐 {saldoData.stats.ultimaAtualizacao}
              </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <StatCard
                title="💰 Saldo Atual"
                value={formatCurrency(saldoData.stats.saldoAtual)}
                icon="💵"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="📊 Variação Total"
                value={formatCurrency(saldoData.stats.variacaoTotal)}
                icon={saldoData.stats.variacaoTotal >= 0 ? "📈" : "📉"}
                gradient={saldoData.stats.variacaoTotal >= 0 ? colors.gradients.lime : colors.gradients.sunset}
              />
              <StatCard
                title="⬆️ Maior Saldo"
                value={formatCurrency(saldoData.stats.maiorSaldo)}
                icon="🔝"
                gradient={colors.gradients.blueGreen}
              />
              <StatCard
                title="⬇️ Menor Saldo"
                value={formatCurrency(saldoData.stats.menorSaldo)}
                icon="📍"
                gradient={colors.gradients.purple}
              />
            </div>

            {/* Gráficos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px', marginBottom: '40px' }}>
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
                  📊 Evolução de Saldo
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={saldoData.data}>
                    <defs>
                      <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={colors.gold} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={colors.gold} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={100} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Area type="monotone" dataKey="saldoFinal" name="Saldo Final" stroke={colors.gold} fill="url(#saldoGrad)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  background: colors.gradients.lime,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  📈 Variação de Saldo por Período
                </h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={saldoData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={100} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Bar dataKey="variacao" name="Variação" fill={colors.lime} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </>
        )}

        {/* ==== DASHBOARD ANÁLISE DE USUÁRIOS (LTV & COMPORTAMENTO) ==== */}
        {activeDashboard === 'usuarios' && usuariosData && usuariosData.stats && (
          <>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '900',
              background: colors.gradients.purple,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '16px',
              textAlign: 'center'
            }}>
              👥 Dashboard de Análise de Usuários
            </h2>

            {/* Info Badges */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              marginBottom: '32px'
            }}>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                border: `1px solid ${colors.purple}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.purple,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 {usuariosData.count} períodos analisados
              </div>
              <div style={{
                padding: '8px 16px',
                background: darkMode ? 'rgba(0, 245, 255, 0.1)' : 'rgba(0, 245, 255, 0.1)',
                border: `1px solid ${colors.cyan}`,
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: '700',
                color: colors.cyan
              }}>
                🕐 {usuariosData.stats.ultimaAtualizacao}
              </div>
            </div>

            {/* KPI Cards - Médias */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: '800',
              background: colors.gradients.gold,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px'
            }}>
              💰 Métricas Médias (LTV)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <StatCard
                title="💵 Depósito Médio"
                value={formatCurrency(usuariosData.stats.depositoMedio)}
                icon="💰"
                gradient={colors.gradients.gold}
              />
              <StatCard
                title="💸 Saque Médio"
                value={formatCurrency(usuariosData.stats.saqueMedio)}
                icon="💳"
                gradient={colors.gradients.blueGreen}
              />
              <StatCard
                title="🎫 Ticket Médio"
                value={formatCurrency(usuariosData.stats.ticketMedio)}
                icon="🎰"
                gradient={colors.gradients.purple}
              />
              <StatCard
                title="💎 GGR Médio/Jogador"
                value={formatCurrency(usuariosData.stats.ggrMedioJogador)}
                icon="💰"
                gradient={colors.gradients.lime}
              />
            </div>

            {/* Segmentação de Usuários */}
            <h3 style={{
              fontSize: '22px',
              fontWeight: '800',
              background: colors.gradients.purple,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px'
            }}>
              👥 Segmentação de Usuários
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
              <GlassCard>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐋</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: colors.gold, marginBottom: '8px' }}>
                    {usuariosData.segmentacao.baleias}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.text.secondary, fontWeight: '600' }}>
                    Baleias (Ticket &gt; R$ 1.000)
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>💎</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: colors.cyan, marginBottom: '8px' }}>
                    {usuariosData.segmentacao.altoValor}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.text.secondary, fontWeight: '600' }}>
                    Alto Valor (R$ 500-1.000)
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎰</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: colors.purple, marginBottom: '8px' }}>
                    {usuariosData.segmentacao.medioValor}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.text.secondary, fontWeight: '600' }}>
                    Médio Valor (R$ 100-500)
                  </div>
                </div>
              </GlassCard>
              <GlassCard>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎲</div>
                  <div style={{ fontSize: '32px', fontWeight: '800', color: colors.lime, marginBottom: '8px' }}>
                    {usuariosData.segmentacao.casual}
                  </div>
                  <div style={{ fontSize: '14px', color: colors.text.secondary, fontWeight: '600' }}>
                    Casual (&lt; R$ 100)
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Gráficos */}
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
                  💰 Evolução de Ticket Médio
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={usuariosData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Line type="monotone" dataKey="ticketMedio" name="Ticket Médio" stroke={colors.gold} strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
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
                  💎 GGR Médio por Jogador
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={usuariosData.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Line type="monotone" dataKey="ggrMedioJogador" name="GGR Médio/Jogador" stroke={colors.purple} strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard style={{ gridColumn: 'span 2' }}>
                <h3 style={{
                  color: colors.text.primary,
                  fontSize: '18px',
                  fontWeight: '800',
                  marginBottom: '24px',
                  background: colors.gradients.blueGreen,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}>
                  💵 Depósito Médio vs Saque Médio
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={usuariosData.data.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'} />
                    <XAxis dataKey="timestamp" angle={-45} textAnchor="end" height={80} stroke={colors.text.tertiary} style={{ fontSize: '11px' }} />
                    <YAxis stroke={colors.text.tertiary} style={{ fontSize: '12px' }} />
                    <Tooltip contentStyle={{
                      background: darkMode ? 'rgba(26, 29, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                      border: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      fontWeight: '600'
                    }} />
                    <Legend />
                    <Bar dataKey="depositoMedio" name="Depósito Médio" fill={colors.lime} />
                    <Bar dataKey="saqueMedio" name="Saque Médio" fill={colors.cyan} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </>
        )}

        {/* ==== DASHBOARD FINGERPRINT & SEGURANÇA ==== */}
        {activeDashboard === 'fingerprint' && (
          <div style={{ marginTop: '30px' }}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '900',
              background: colors.gradients.purple,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: '24px',
              textAlign: 'center',
              filter: 'drop-shadow(0 0 20px rgba(168, 85, 247, 0.4))'
            }}>
              🔍 Segurança & Fingerprint
            </h2>

            {fingerprintLoading && (
              <div style={{ textAlign: 'center', padding: '60px', color: colors.text.secondary }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
                <p style={{ fontSize: '16px', fontWeight: '600' }}>Carregando dados de fingerprint...</p>
              </div>
            )}

            {fingerprintError && (
              <GlassCard style={{
                padding: '24px',
                marginBottom: '24px',
                background: 'rgba(255, 71, 87, 0.1)',
                border: `2px solid ${colors.danger}`
              }}>
                <div style={{ color: colors.danger, fontSize: '16px', fontWeight: '700', textAlign: 'center' }}>
                  ❌ Erro: {fingerprintError}
                </div>
              </GlassCard>
            )}

            {/* Estatísticas */}
            {fingerprintStats && !fingerprintLoading && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                <GlassCard style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, rgba(217, 160, 13, 0.1) 0%, rgba(217, 160, 13, 0.05) 100%)`,
                  border: `2px solid ${colors.gold}40`
                }}>
                  <div style={{ fontSize: '13px', color: colors.text.secondary, marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Total de Registros
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: colors.gold, marginBottom: '8px' }}>
                    {fingerprintStats.totalRecords}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    📊 Logins registrados
                  </div>
                </GlassCard>

                <GlassCard style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, rgba(13, 255, 153, 0.1) 0%, rgba(13, 255, 153, 0.05) 100%)`,
                  border: `2px solid ${colors.lime}40`
                }}>
                  <div style={{ fontSize: '13px', color: colors.text.secondary, marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Visitantes Únicos
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: colors.lime, marginBottom: '8px' }}>
                    {fingerprintStats.uniqueVisitors}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    👤 Dispositivos diferentes
                  </div>
                </GlassCard>

                <GlassCard style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, rgba(0, 245, 255, 0.1) 0%, rgba(0, 245, 255, 0.05) 100%)`,
                  border: `2px solid ${colors.cyan}40`
                }}>
                  <div style={{ fontSize: '13px', color: colors.text.secondary, marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    IPs Únicos
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: colors.cyan, marginBottom: '8px' }}>
                    {fingerprintStats.uniqueIPs}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    🌐 Endereços diferentes
                  </div>
                </GlassCard>

                <GlassCard style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, rgba(255, 71, 87, 0.15) 0%, rgba(255, 71, 87, 0.05) 100%)`,
                  border: `2px solid ${colors.danger}40`,
                  boxShadow: fingerprintStats.vpnDetections > 0 ? `0 0 30px ${colors.danger}40` : 'none'
                }}>
                  <div style={{ fontSize: '13px', color: colors.text.secondary, marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Detecções VPN
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: colors.danger, marginBottom: '8px' }}>
                    {fingerprintStats.vpnDetections}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    🚫 Conexões via VPN
                  </div>
                </GlassCard>

                <GlassCard style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.05) 100%)`,
                  border: `2px solid ${colors.warning}40`
                }}>
                  <div style={{ fontSize: '13px', color: colors.text.secondary, marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Detecções Proxy
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: colors.warning, marginBottom: '8px' }}>
                    {fingerprintStats.proxyDetections}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    ⚠️ Conexões via Proxy
                  </div>
                </GlassCard>

                <GlassCard style={{
                  padding: '24px',
                  background: `linear-gradient(135deg, rgba(255, 71, 87, 0.2) 0%, rgba(255, 71, 87, 0.05) 100%)`,
                  border: `2px solid ${colors.danger}`,
                  boxShadow: fingerprintStats.torDetections > 0 ? `0 0 30px ${colors.danger}60` : 'none'
                }}>
                  <div style={{ fontSize: '13px', color: colors.text.secondary, marginBottom: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Detecções Tor
                  </div>
                  <div style={{ fontSize: '36px', fontWeight: '900', color: colors.danger, marginBottom: '8px' }}>
                    {fingerprintStats.torDetections}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.text.tertiary }}>
                    🧅 Conexões via Tor
                  </div>
                </GlassCard>
              </div>
            )}

            {/* Tabela de Histórico */}
            {fingerprintData && fingerprintData.length > 0 && !fingerprintLoading && (
              <GlassCard style={{ padding: '24px', overflowX: 'auto' }}>
                <h3 style={{
                  color: colors.text.primary,
                  marginBottom: '24px',
                  fontSize: '20px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '28px' }}>📋</span>
                  Histórico de Logins ({fingerprintData.length})
                </h3>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    minWidth: '900px'
                  }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
                        <th style={{ padding: '16px 12px', textAlign: 'left', color: colors.text.secondary, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Data/Hora
                        </th>
                        <th style={{ padding: '16px 12px', textAlign: 'left', color: colors.text.secondary, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Usuário
                        </th>
                        <th style={{ padding: '16px 12px', textAlign: 'left', color: colors.text.secondary, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          IP
                        </th>
                        <th style={{ padding: '16px 12px', textAlign: 'left', color: colors.text.secondary, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Dispositivo
                        </th>
                        <th style={{ padding: '16px 12px', textAlign: 'left', color: colors.text.secondary, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Navegador
                        </th>
                        <th style={{ padding: '16px 12px', textAlign: 'left', color: colors.text.secondary, fontSize: '13px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Alertas de Segurança
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {fingerprintData.slice().reverse().slice(0, 100).map((record, idx) => (
                        <tr key={idx} style={{
                          borderBottom: `1px solid ${darkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = darkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}>
                          <td style={{ padding: '14px 12px', color: colors.text.primary, fontSize: '14px', fontWeight: '600' }}>
                            {new Date(record.receivedAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit'
                            })}
                          </td>
                          <td style={{ padding: '14px 12px', color: colors.text.primary, fontSize: '14px', fontWeight: '700' }}>
                            {record.username || record.authenticatedUser}
                          </td>
                          <td style={{ padding: '14px 12px', color: colors.cyan, fontSize: '13px', fontFamily: 'monospace', fontWeight: '600' }}>
                            {record.ipAddress || 'N/A'}
                          </td>
                          <td style={{ padding: '14px 12px', color: colors.text.secondary, fontSize: '13px' }}>
                            {record.os} - {record.device}
                          </td>
                          <td style={{ padding: '14px 12px', color: colors.text.secondary, fontSize: '13px' }}>
                            {record.browserName}
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '14px' }}>
                            {record.isVPN && (
                              <span style={{
                                background: 'rgba(255, 71, 87, 0.2)',
                                color: colors.danger,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                marginRight: '6px',
                                display: 'inline-block',
                                border: `1px solid ${colors.danger}`
                              }}>
                                🚫 VPN
                              </span>
                            )}
                            {record.isProxy && (
                              <span style={{
                                background: 'rgba(251, 191, 36, 0.2)',
                                color: colors.warning,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                marginRight: '6px',
                                display: 'inline-block',
                                border: `1px solid ${colors.warning}`
                              }}>
                                ⚠️ Proxy
                              </span>
                            )}
                            {record.isTor && (
                              <span style={{
                                background: 'rgba(255, 71, 87, 0.3)',
                                color: colors.danger,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                marginRight: '6px',
                                display: 'inline-block',
                                border: `2px solid ${colors.danger}`
                              }}>
                                🧅 Tor
                              </span>
                            )}
                            {record.isIncognito && (
                              <span style={{
                                background: 'rgba(168, 85, 247, 0.2)',
                                color: colors.purple,
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                marginRight: '6px',
                                display: 'inline-block',
                                border: `1px solid ${colors.purple}`
                              }}>
                                🕶️ Incógnito
                              </span>
                            )}
                            {!record.isVPN && !record.isProxy && !record.isTor && (
                              <span style={{
                                color: colors.success,
                                fontSize: '14px',
                                fontWeight: '700'
                              }}>
                                ✅ OK
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassCard>
            )}

            {fingerprintData && fingerprintData.length === 0 && !fingerprintLoading && (
              <GlassCard style={{ padding: '60px', textAlign: 'center' }}>
                <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.6 }}>🔍</div>
                <div style={{ fontSize: '20px', fontWeight: '800', color: colors.text.primary, marginBottom: '12px' }}>
                  Nenhum dado de fingerprint encontrado
                </div>
                <div style={{ fontSize: '15px', color: colors.text.tertiary }}>
                  Os dados de fingerprint serão coletados automaticamente no próximo login.
                </div>
              </GlassCard>
            )}
          </div>
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
