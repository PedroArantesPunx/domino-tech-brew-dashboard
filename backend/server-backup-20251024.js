// ========================================
// ARQUIVO: server.js
// Backend Node.js para integração com Slack
// ========================================

require('dotenv').config();
const express = require('express');
const { WebClient } = require('@slack/web-api');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

// ==================== CONFIGURAÇÃO ====================

const app = express();
const PORT = process.env.PORT || 3001;

// Token do Slack (vem do arquivo .env)
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

// ID do canal onde os alertas são enviados
const CHANNEL_ID = process.env.CHANNEL_ID;

// Inicializar cliente do Slack
const slackClient = new WebClient(SLACK_BOT_TOKEN);

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'dashboard-backend',
        version: '1.0.0'
    });
});

// Arquivo para armazenar os dados
const DATA_FILE = path.join(__dirname, 'alertas.json');

// ==================== FUNÇÕES AUXILIARES ====================

/**
 * Função para extrair dados da mensagem do Slack
 * Suporta dois formatos: "Relatório de Performance de Produtos" e "Relatório Time de Risco"
 */
function parseSlackMessage(text) {
  try {
    // Usar timezone de Brasília (UTC-3)
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    const data = {
      timestamp: brasiliaTime.toISOString(),
      hora: brasiliaTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
      data: brasiliaTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
    };

    // Determinar tipo de relatório
    if (text.includes('Relatório de Performance de Produtos')) {
      data.tipoRelatorio = 'Performance de Produtos';

      // Extrair GGR Total (do TOTAL GERAL)
      const ggrTotalMatch = text.match(/TOTAL GERAL[\s\S]*?Lucro Bruto \(GGR\):.*?R\$\s*([0-9,\.]+)/);
      if (ggrTotalMatch) {
        data.ggr = parseFloat(ggrTotalMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair NGR Total (do TOTAL GERAL)
      const ngrTotalMatch = text.match(/TOTAL GERAL[\s\S]*?Lucro Líquido \(NGR\):.*?R\$\s*([0-9,\.]+)/);
      if (ngrTotalMatch) {
        data.ngr = parseFloat(ngrTotalMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Turnover Total
      const turnoverMatch = text.match(/Turnover Total:.*?R\$\s*([0-9,\.]+)/);
      if (turnoverMatch) {
        data.turnoverTotal = parseFloat(turnoverMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair dados do Cassino
      const cassinoTurnoverMatch = text.match(/CASSINO[\s\S]*?Turnover:.*?R\$\s*([0-9,\.]+)/);
      if (cassinoTurnoverMatch) {
        data.cassinoTurnover = parseFloat(cassinoTurnoverMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      const cassinoGGRMatch = text.match(/CASSINO[\s\S]*?Lucro Bruto \(GGR\):.*?R\$\s*([0-9,\.]+)/);
      if (cassinoGGRMatch) {
        data.cassinoGGR = parseFloat(cassinoGGRMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair dados do Sportsbook
      const sportsTurnoverMatch = text.match(/SPORTSBOOK[\s\S]*?Turnover:.*?R\$\s*([0-9,\.]+)/);
      if (sportsTurnoverMatch) {
        data.sportsbookTurnover = parseFloat(sportsTurnoverMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      const sportsGGRMatch = text.match(/SPORTSBOOK[\s\S]*?Lucro Bruto \(GGR\):.*?R\$\s*([0-9,\.]+)/);
      if (sportsGGRMatch) {
        data.sportsbookGGR = parseFloat(sportsGGRMatch[1].replace(/\./g, '').replace(',', '.'));
      }

    } else if (text.includes('Relatório Time de Risco')) {
      data.tipoRelatorio = 'Time de Risco';

      // Extrair GGR
      const ggrMatch = text.match(/Lucro Bruto \(GGR\):.*?R\$\s*([0-9,\.]+)/);
      if (ggrMatch) {
        data.ggr = parseFloat(ggrMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair NGR
      const ngrMatch = text.match(/Lucro Líquido \(NGR\):.*?R\$\s*([0-9,\.]+)/);
      if (ngrMatch) {
        data.ngr = parseFloat(ngrMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Depósitos
      const depositosMatch = text.match(/Depósitos:.*?R\$\s*([0-9,\.]+)/);
      if (depositosMatch) {
        data.depositos = parseFloat(depositosMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Saques
      const saquesMatch = text.match(/Saques:.*?R\$\s*([0-9,\.]+)/);
      if (saquesMatch) {
        data.saques = parseFloat(saquesMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Fluxo Líquido
      const fluxoMatch = text.match(/Fluxo Líquido:.*?R\$\s*([0-9,\.]+)/);
      if (fluxoMatch) {
        data.fluxoLiquido = parseFloat(fluxoMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Jogadores Únicos
      const jogadoresMatch = text.match(/Jogadores Únicos:.*?([0-9,\.]+)/);
      if (jogadoresMatch) {
        data.jogadoresUnicos = parseInt(jogadoresMatch[1].replace(/\./g, '').replace(',', ''));
      }

      // Extrair Apostadores
      const apostadoresMatch = text.match(/Apostadores:.*?([0-9,\.]+)/);
      if (apostadoresMatch) {
        data.apostadores = parseInt(apostadoresMatch[1].replace(/\./g, '').replace(',', ''));
      }

      // Extrair Depositantes
      const depositantesMatch = text.match(/Depositantes:.*?([0-9,\.]+)/);
      if (depositantesMatch) {
        data.depositantes = parseInt(depositantesMatch[1].replace(/\./g, '').replace(',', ''));
      }

      // ==================== NOVOS CAMPOS: SALDO E VARIAÇÃO ====================

      // Extrair Saldo Inicial
      const saldoInicialMatch = text.match(/Saldo Inicial:.*?R\$\s*([0-9,\.]+)/);
      if (saldoInicialMatch) {
        data.saldoInicial = parseFloat(saldoInicialMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Saldo Final
      const saldoFinalMatch = text.match(/Saldo Final:.*?R\$\s*([0-9,\.]+)/);
      if (saldoFinalMatch) {
        data.saldoFinal = parseFloat(saldoFinalMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Variação de Saldo
      const variacaoSaldoMatch = text.match(/Variação de Saldo:.*?R\$\s*([0-9,\.]+)/);
      if (variacaoSaldoMatch) {
        data.variacaoSaldo = parseFloat(variacaoSaldoMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // ==================== NOVOS CAMPOS: COMPORTAMENTO FINANCEIRO ====================

      // Extrair Depósito médio por depositante
      const depositoMedioMatch = text.match(/Depósito médio \/ depositante:.*?R\$\s*([0-9,\.]+)/);
      if (depositoMedioMatch) {
        data.depositoMedio = parseFloat(depositoMedioMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Número médio de depósitos por depositante
      const numDepositosMatch = text.match(/Nº médio de depósitos \/ depositante:.*?([0-9,\.]+)/);
      if (numDepositosMatch) {
        data.numeroMedioDepositos = parseFloat(numDepositosMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Saque médio por sacador
      const saqueMedioMatch = text.match(/Saque médio \/ sacador:.*?R\$\s*([0-9,\.]+)/);
      if (saqueMedioMatch) {
        data.saqueMedio = parseFloat(saqueMedioMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Ticket médio por jogador ativo
      const ticketMedioMatch = text.match(/Ticket médio \/ jogador ativo:.*?R\$\s*([0-9,\.]+)/);
      if (ticketMedioMatch) {
        data.ticketMedio = parseFloat(ticketMedioMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair GGR médio por jogador ativo
      const ggrMedioJogadorMatch = text.match(/GGR médio \/ jogador ativo:.*?R\$\s*([0-9,\.]+)/);
      if (ggrMedioJogadorMatch) {
        data.ggrMedioJogador = parseFloat(ggrMedioJogadorMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // ==================== NOVOS CAMPOS: BÔNUS E PROMOÇÕES ====================

      // Extrair Bônus concedidos
      const bonusConcedidosMatch = text.match(/Bônus concedidos:.*?R\$\s*([0-9,\.]+)/);
      if (bonusConcedidosMatch) {
        data.bonusConcedidos = parseFloat(bonusConcedidosMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Bônus convertidos em cash
      const bonusConvertidosMatch = text.match(/Bônus convertidos em cash:.*?R\$\s*([0-9,\.]+)/);
      if (bonusConvertidosMatch) {
        data.bonusConvertidos = parseFloat(bonusConvertidosMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Taxa de conversão de bônus
      const taxaConversaoBonusMatch = text.match(/Taxa de conversão:.*?\(\s*([0-9,\.]+)%/);
      if (taxaConversaoBonusMatch) {
        data.taxaConversaoBonus = parseFloat(taxaConversaoBonusMatch[1].replace(',', '.'));
      }

      // Extrair Apostas feitas com bônus
      const apostasComBonusMatch = text.match(/Apostas feitas com bônus:.*?R\$\s*([0-9,\.]+)/);
      if (apostasComBonusMatch) {
        data.apostasComBonus = parseFloat(apostasComBonusMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Extrair Custo de bônus
      const custoBonusMatch = text.match(/Custo de bônus.*?R\$\s*([0-9,\.]+)/);
      if (custoBonusMatch) {
        data.custoBonus = parseFloat(custoBonusMatch[1].replace(/\./g, '').replace(',', '.'));
      }
    }

    return data;
  } catch (error) {
    console.error('Erro ao fazer parse da mensagem:', error);
    return null;
  }
}

/**
 * Salvar dados no arquivo JSON
 */
async function saveData(newData) {
  try {
    let allData = [];
    
    // Tentar ler dados existentes
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      // Arquivo não existe ainda, criar novo
      console.log('Criando novo arquivo de dados...');
    }

    // Adicionar novos dados
    allData.push(newData);

    // Salvar no arquivo
    await fs.writeFile(DATA_FILE, JSON.stringify(allData, null, 2));
    console.log('✅ Dados salvos com sucesso!');
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar dados:', error);
    return false;
  }
}

/**
 * Buscar TODAS as mensagens do Slack com paginação
 * Percorre todo o histórico do canal usando cursor
 */
async function fetchSlackMessages() {
  try {
    console.log('📥 Buscando TODO o histórico de mensagens do Slack...');

    let allMessages = [];
    let cursor = null;
    let pageCount = 0;

    do {
      pageCount++;
      console.log(`📄 Buscando página ${pageCount}...`);

      const options = {
        channel: CHANNEL_ID,
        limit: 1000 // Máximo permitido pela API do Slack
      };

      // Adicionar cursor se não for a primeira página
      if (cursor) {
        options.cursor = cursor;
      }

      const result = await slackClient.conversations.history(options);

      if (result.messages && result.messages.length > 0) {
        console.log(`   ✅ Encontradas ${result.messages.length} mensagens nesta página`);
        allMessages = allMessages.concat(result.messages);

        // Processar cada mensagem
        for (const message of result.messages) {
          if (message.text && (
            message.text.includes('Relatório de Performance de Produtos') ||
            message.text.includes('Relatório Time de Risco')
          )) {
            const parsedData = parseSlackMessage(message.text);
            if (parsedData) {
              await saveData(parsedData);
            }
          }
        }
      }

      // Verificar se há mais páginas
      cursor = result.response_metadata?.next_cursor;

      // Pequeno delay para respeitar rate limits do Slack
      if (cursor) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo
      }

    } while (cursor);

    console.log(`\n🎉 Busca completa! Total de ${allMessages.length} mensagens processadas em ${pageCount} páginas`);
    return allMessages;

  } catch (error) {
    console.error('❌ Erro ao buscar mensagens:', error.message);
    console.error('📝 Detalhes do erro:', JSON.stringify(error.data, null, 2));

    // Se o erro for relacionado ao token ou canal
    if (error.message.includes('invalid_auth')) {
      console.log('\n⚠️ ERRO: Token inválido. Verifique se você configurou o SLACK_BOT_TOKEN corretamente.');
    } else if (error.message.includes('channel_not_found')) {
      console.log('\n⚠️ ERRO: Canal não encontrado. Execute o endpoint /api/list-channels para descobrir o ID correto.');
    } else if (error.message.includes('missing_scope')) {
      console.log('\n⚠️ ERRO: Permissão faltando no Slack App.');
      console.log('Scope necessário:', error.data?.needed);
      console.log('Scopes atuais:', error.data?.provided);
    }

    return [];
  }
}

// ==================== ROTAS DA API ====================

/**
 * Listar todos os canais (para descobrir o CHANNEL_ID)
 */
app.get('/api/list-channels', async (req, res) => {
  try {
    const result = await slackClient.conversations.list({
      types: 'public_channel,private_channel'
    });

    const channels = result.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private,
      is_member: channel.is_member
    }));

    res.json({
      success: true,
      channels: channels,
      message: 'Encontre o canal dos alertas e copie o ID dele'
    });
  } catch (error) {
    console.error('❌ Erro ao listar canais:', error.message);
    console.error('📝 Detalhes do erro:', JSON.stringify(error.data, null, 2));

    res.status(500).json({
      success: false,
      error: error.message,
      details: error.data
    });
  }
});

/**
 * Buscar novas mensagens do Slack manualmente
 */
app.get('/api/fetch-messages', async (req, res) => {
  try {
    const messages = await fetchSlackMessages();
    res.json({
      success: true,
      message: 'Mensagens processadas',
      count: messages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Debug: Ver mensagens brutas do Slack
 */
app.get('/api/debug-messages', async (req, res) => {
  try {
    const result = await slackClient.conversations.history({
      channel: CHANNEL_ID,
      limit: 10 // Últimas 10 mensagens
    });

    const messages = result.messages.map(msg => ({
      text: msg.text ? msg.text.substring(0, 500) : null, // Primeiros 500 caracteres
      hasText: !!msg.text,
      timestamp: msg.ts,
      user: msg.user,
      type: msg.type
    }));

    res.json({
      success: true,
      messages: messages,
      total: result.messages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Obter todos os dados armazenados
 */
app.get('/api/data', async (req, res) => {
  try {
    const fileContent = await fs.readFile(DATA_FILE, 'utf8');
    const data = JSON.parse(fileContent);
    
    res.json({
      success: true,
      data: data,
      total: data.length
    });
  } catch (error) {
    // Se arquivo não existe, retornar array vazio
    if (error.code === 'ENOENT') {
      res.json({
        success: true,
        data: [],
        total: 0
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

/**
 * Limpar todos os dados (útil para testes)
 */
app.delete('/api/data', async (req, res) => {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
    res.json({
      success: true,
      message: 'Dados limpos com sucesso'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Testar o parser com uma mensagem de exemplo
 */
app.post('/api/test-parser', async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      success: false,
      error: 'Forneça uma mensagem no body: { "message": "..." }'
    });
  }

  const parsed = parseSlackMessage(message);

  res.json({
    success: true,
    parsed: parsed
  });
});

/**
 * Função para calcular diferenças incrementais (valores acumulados do dia resetam à 00:00)
 * Os valores do Slack são acumulados desde 00:00, então precisamos calcular a diferença
 * entre períodos para obter o valor real de cada intervalo.
 */
function calculateIncrementalValues(allData) {
  // Ordenar por data e hora
  const sorted = [...allData].sort((a, b) => {
    const dateA = new Date(a.timestamp);
    const dateB = new Date(b.timestamp);
    return dateA - dateB;
  });

  // Agrupar por data e tipo de relatório
  const groupedByDay = {};

  sorted.forEach(item => {
    const dayKey = `${item.data}-${item.tipoRelatorio}`;
    if (!groupedByDay[dayKey]) {
      groupedByDay[dayKey] = [];
    }
    groupedByDay[dayKey].push(item);
  });

  // Calcular diferenças para cada dia
  const result = [];

  Object.values(groupedByDay).forEach(dayData => {
    let previousValues = null;

    dayData.forEach((current, index) => {
      const processed = { ...current };

      if (index === 0) {
        // Primeiro registro do dia - usar valores como estão (são o inicial)
        processed.ggrIncremental = current.ggr || 0;
        processed.ngrIncremental = current.ngr || 0;
        processed.depositosIncremental = current.depositos || 0;
        processed.saquesIncremental = current.saques || 0;
        processed.turnoverIncremental = current.turnoverTotal || 0;

        // Manter valores originais acumulados também
        processed.ggrAcumulado = current.ggr || 0;
        processed.ngrAcumulado = current.ngr || 0;
        processed.depositosAcumulado = current.depositos || 0;
        processed.saquesAcumulado = current.saques || 0;

        previousValues = current;
      } else {
        // Registros subsequentes - calcular diferença
        processed.ggrIncremental = (current.ggr || 0) - (previousValues.ggr || 0);
        processed.ngrIncremental = (current.ngr || 0) - (previousValues.ngr || 0);
        processed.depositosIncremental = (current.depositos || 0) - (previousValues.depositos || 0);
        processed.saquesIncremental = (current.saques || 0) - (previousValues.saques || 0);
        processed.turnoverIncremental = (current.turnoverTotal || 0) - (previousValues.turnoverTotal || 0);

        // Manter valores acumulados
        processed.ggrAcumulado = current.ggr || 0;
        processed.ngrAcumulado = current.ngr || 0;
        processed.depositosAcumulado = current.depositos || 0;
        processed.saquesAcumulado = current.saques || 0;

        previousValues = current;
      }

      // Garantir que não temos valores negativos (pode acontecer se houver ajustes/correções)
      processed.ggrIncremental = Math.max(0, processed.ggrIncremental);
      processed.ngrIncremental = Math.max(0, processed.ngrIncremental);
      processed.depositosIncremental = Math.max(0, processed.depositosIncremental);
      processed.saquesIncremental = Math.max(0, processed.saquesIncremental);
      processed.turnoverIncremental = Math.max(0, processed.turnoverIncremental);

      result.push(processed);
    });
  });

  return result;
}

/**
 * Função para agregar dados por hora para análise
 * Evita duplicidade e melhora a visualização
 * ATUALIZADO: Agora usa valores incrementais ao invés de acumulados
 */
function aggregateDataByHour(allData) {
  // Primeiro calcular valores incrementais
  const incrementalData = calculateIncrementalValues(allData);

  const aggregated = {};

  incrementalData.forEach(item => {
    const key = `${item.data}-${item.hora}-${item.tipoRelatorio}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        ...item,
        count: 1,
        valores: {
          ggr: item.ggrIncremental ? [item.ggrIncremental] : [],
          ngr: item.ngrIncremental ? [item.ngrIncremental] : [],
          turnoverTotal: item.turnoverIncremental ? [item.turnoverIncremental] : [],
          depositos: item.depositosIncremental ? [item.depositosIncremental] : [],
          saques: item.saquesIncremental ? [item.saquesIncremental] : []
        }
      };
    } else {
      // Acumular valores incrementais
      aggregated[key].count++;
      if (item.ggrIncremental) aggregated[key].valores.ggr.push(item.ggrIncremental);
      if (item.ngrIncremental) aggregated[key].valores.ngr.push(item.ngrIncremental);
      if (item.turnoverIncremental) aggregated[key].valores.turnoverTotal.push(item.turnoverIncremental);
      if (item.depositosIncremental) aggregated[key].valores.depositos.push(item.depositosIncremental);
      if (item.saquesIncremental) aggregated[key].valores.saques.push(item.saquesIncremental);
    }
  });

  // Calcular médias dos valores incrementais
  return Object.values(aggregated).map(item => ({
    timestamp: item.timestamp,
    hora: item.hora,
    data: item.data,
    tipoRelatorio: item.tipoRelatorio,
    count: item.count,

    // Valores incrementais (diferença do período)
    ggr: item.valores.ggr.length > 0 ? item.valores.ggr.reduce((a, b) => a + b) / item.valores.ggr.length : null,
    ngr: item.valores.ngr.length > 0 ? item.valores.ngr.reduce((a, b) => a + b) / item.valores.ngr.length : null,
    turnoverTotal: item.valores.turnoverTotal.length > 0 ? item.valores.turnoverTotal.reduce((a, b) => a + b) / item.valores.turnoverTotal.length : null,
    depositos: item.valores.depositos.length > 0 ? item.valores.depositos.reduce((a, b) => a + b) / item.valores.depositos.length : null,
    saques: item.valores.saques.length > 0 ? item.valores.saques.reduce((a, b) => a + b) / item.valores.saques.length : null,

    // Valores acumulados (para referência)
    ggrAcumulado: item.ggrAcumulado,
    ngrAcumulado: item.ngrAcumulado,
    depositosAcumulado: item.depositosAcumulado,
    saquesAcumulado: item.saquesAcumulado,

    // Outros campos (não são acumulados)
    cassinoGGR: item.cassinoGGR,
    cassinoTurnover: item.cassinoTurnover,
    sportsbookGGR: item.sportsbookGGR,
    sportsbookTurnover: item.sportsbookTurnover,
    fluxoLiquido: item.fluxoLiquido,
    jogadoresUnicos: item.jogadoresUnicos,
    apostadores: item.apostadores,
    depositantes: item.depositantes,
    saldoInicial: item.saldoInicial,
    saldoFinal: item.saldoFinal,
    variacaoSaldo: item.variacaoSaldo,
    depositoMedio: item.depositoMedio,
    numeroMedioDepositos: item.numeroMedioDepositos,
    saqueMedio: item.saqueMedio,
    ticketMedio: item.ticketMedio,
    ggrMedioJogador: item.ggrMedioJogador,
    bonusConcedidos: item.bonusConcedidos,
    bonusConvertidos: item.bonusConvertidos,
    taxaConversaoBonus: item.taxaConversaoBonus,
    apostasComBonus: item.apostasComBonus,
    custoBonus: item.custoBonus
  }));
}

/**
 * Endpoint para o dashboard frontend
 * Retorna dados processados e estatísticas
 */
app.get('/api/dashboard-data', async (req, res) => {
  try {
    let allData = [];

    // Tentar ler dados existentes
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      // Arquivo não existe ainda
      console.log('Nenhum dado armazenado ainda');
    }

    // Agregar dados por hora para melhor análise
    const aggregatedData = aggregateDataByHour(allData);

    // Calcular estatísticas usando timezone de Brasília
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = brasiliaTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    const todayData = aggregatedData.filter(item => item.data === today);

    const stats = {
      totalAlertas: aggregatedData.length,
      alertasHoje: todayData.length,
      ultimoAlerta: aggregatedData.length > 0 ? aggregatedData[aggregatedData.length - 1] : null,
      ultimaAtualizacao: brasiliaTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      totalRegistrosBrutos: allData.length // Para debug
    };

    res.json({
      success: true,
      data: aggregatedData,
      stats: stats,
      message: aggregatedData.length === 0 ? 'Nenhum dado disponível ainda. Aguardando mensagens do Slack.' : `Dados carregados com sucesso (${allData.length} registros agregados em ${aggregatedData.length} períodos)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== INICIALIZAÇÃO ====================

/**
 * Buscar mensagens automaticamente a cada hora
 */
function startAutoFetch() {
  // Buscar imediatamente ao iniciar
  fetchSlackMessages();
  
  // Depois buscar a cada 1 hora (3600000 ms)
  setInterval(() => {
    console.log('\n⏰ Busca automática iniciada...');
    fetchSlackMessages();
  }, 3600000); // 1 hora
}

/**
 * Iniciar servidor
 */
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   🚀 Servidor rodando na porta ${PORT}         ║
╚═══════════════════════════════════════════════╝

📋 Endpoints disponíveis:

1. GET  /api/list-channels
   → Lista todos os canais para você descobrir o CHANNEL_ID

2. GET  /api/fetch-messages
   → Busca manualmente novas mensagens do Slack

3. GET  /api/data
   → Retorna todos os dados armazenados

4. DELETE /api/data
   → Limpa todos os dados (útil para testes)

5. POST /api/test-parser
   → Testa o parser com uma mensagem de exemplo

⚙️  Próximos passos:
1. Configure SLACK_BOT_TOKEN no código
2. Acesse http://localhost:${PORT}/api/list-channels
3. Copie o ID do seu canal e configure CHANNEL_ID
4. Acesse http://localhost:${PORT}/api/fetch-messages
5. Verifique os dados em http://localhost:${PORT}/api/data

✅ Busca automática ativada (a cada 1 hora)
  `);
  
  // Iniciar busca automática
  startAutoFetch();
});