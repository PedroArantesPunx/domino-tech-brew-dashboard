// ========================================
// ARQUIVO: server.js
// Backend Node.js para integração com Slack
// ========================================

// teste GitHub Actions  EXCLUIR QUANDO VIR NOVAMENTE
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
 * @param {string} text - Texto da mensagem
 * @param {string} slackTimestamp - Timestamp do Slack (formato UNIX timestamp com decimais)
 */
function parseSlackMessage(text, slackTimestamp = null) {
  try {
    // Usar o timestamp da mensagem do Slack se fornecido, senão usar hora atual
    let messageTime;
    if (slackTimestamp) {
      // Converter timestamp do Slack (UNIX timestamp em segundos) para milissegundos
      messageTime = new Date(parseFloat(slackTimestamp) * 1000);
    } else {
      messageTime = new Date();
    }

    // Converter para timezone de Brasília (UTC-3)
    const brasiliaTime = new Date(messageTime.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

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

      const cassinoNGRMatch = text.match(/CASSINO[\s\S]*?Lucro Líquido \(NGR\):.*?R\$\s*([0-9,\.]+)/);
      if (cassinoNGRMatch) {
        data.cassinoNGR = parseFloat(cassinoNGRMatch[1].replace(/\./g, '').replace(',', '.'));
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

      const sportsNGRMatch = text.match(/SPORTSBOOK[\s\S]*?Lucro Líquido \(NGR\):.*?R\$\s*([0-9,\.]+)/);
      if (sportsNGRMatch) {
        data.sportsbookNGR = parseFloat(sportsNGRMatch[1].replace(/\./g, '').replace(',', '.'));
      }

      // Se NGR não foi extraído separadamente, calcular proporcionalmente
      if (!data.cassinoNGR && !data.sportsbookNGR && data.ngr && data.cassinoGGR && data.sportsbookGGR) {
        const totalGGR = data.cassinoGGR + data.sportsbookGGR;
        if (totalGGR > 0) {
          data.cassinoNGR = data.ngr * (data.cassinoGGR / totalGGR);
          data.sportsbookNGR = data.ngr * (data.sportsbookGGR / totalGGR);
        }
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

// ==================== FUNÇÕES DE VALIDAÇÃO E DETECÇÃO DE ANOMALIAS ====================

/**
 * Verifica se o dado é uma duplicata exata do último registro do mesmo tipo
 */
function isDuplicate(newData, existingData) {
  if (!existingData || existingData.length === 0) return false;

  // Buscar o último registro do mesmo tipo de relatório
  const sameTypeRecords = existingData.filter(item => item.tipoRelatorio === newData.tipoRelatorio);
  if (sameTypeRecords.length === 0) return false;

  const lastRecord = sameTypeRecords[sameTypeRecords.length - 1];

  // Campos críticos para comparação (excluindo timestamp e hora)
  const criticalFields = ['ggr', 'ngr', 'turnoverTotal', 'depositos', 'saques',
                          'cassinoGGR', 'cassinoTurnover', 'sportsbookGGR', 'sportsbookTurnover',
                          'jogadoresUnicos', 'apostadores', 'depositantes'];

  // Verificar se todos os campos críticos são idênticos
  const allFieldsMatch = criticalFields.every(field => {
    const newValue = newData[field];
    const oldValue = lastRecord[field];

    // Ambos null/undefined ou valores iguais
    if (newValue === oldValue) return true;
    if (newValue == null && oldValue == null) return true;
    if (newValue == null || oldValue == null) return false;

    // Comparar números com tolerância de 0.001 para evitar problemas de precisão
    return Math.abs(newValue - oldValue) < 0.001;
  });

  if (allFieldsMatch) {
    console.warn(`⚠️  DUPLICATA DETECTADA: ${newData.tipoRelatorio} - ${newData.data} ${newData.hora}`);
    return true;
  }

  return false;
}

/**
 * Calcula valores incrementais (delta) em relação ao registro anterior
 */
function calculateDeltas(newData, existingData) {
  if (!existingData || existingData.length === 0) return newData;

  // Buscar o último registro do mesmo tipo de relatório e mesma data
  const sameTypeRecords = existingData.filter(item =>
    item.tipoRelatorio === newData.tipoRelatorio &&
    item.data === newData.data
  );

  if (sameTypeRecords.length === 0) {
    // Primeiro registro do dia - valores incrementais = valores totais
    newData.deltas = {
      ggr: newData.ggr || 0,
      ngr: newData.ngr || 0,
      turnoverTotal: newData.turnoverTotal || 0,
      depositos: newData.depositos || 0,
      saques: newData.saques || 0,
      isFirstOfDay: true
    };
    return newData;
  }

  const previousRecord = sameTypeRecords[sameTypeRecords.length - 1];

  // Calcular deltas (diferença em relação ao anterior)
  newData.deltas = {
    ggr: (newData.ggr || 0) - (previousRecord.ggr || 0),
    ngr: (newData.ngr || 0) - (previousRecord.ngr || 0),
    turnoverTotal: (newData.turnoverTotal || 0) - (previousRecord.turnoverTotal || 0),
    depositos: (newData.depositos || 0) - (previousRecord.depositos || 0),
    saques: (newData.saques || 0) - (previousRecord.saques || 0),
    isFirstOfDay: false,
    previousTimestamp: previousRecord.timestamp
  };

  return newData;
}

/**
 * Detecta anomalias financeiras baseadas em padrões suspeitos
 * Análise Sênior de Risco Financeiro para iGaming Brasil
 */
function detectAnomalies(newData, existingData) {
  const anomalies = [];

  // 1. VERIFICAÇÃO DE VALORES NEGATIVOS SUSPEITOS
  if (newData.ggr < 0 && Math.abs(newData.ggr) > 10000) {
    anomalies.push({
      type: 'NEGATIVE_GGR_HIGH',
      severity: 'CRITICAL',
      message: `GGR negativo muito alto: R$ ${newData.ggr.toFixed(2)}`,
      field: 'ggr',
      value: newData.ggr
    });
  }

  // 2. DETECÇÃO DE SPIKE ANORMAL (>500% vs média histórica)
  if (existingData && existingData.length > 10) {
    const sameTypeRecords = existingData.filter(item => item.tipoRelatorio === newData.tipoRelatorio);

    if (sameTypeRecords.length >= 10) {
      const recentRecords = sameTypeRecords.slice(-10);
      const avgGGR = recentRecords.reduce((sum, r) => sum + (r.ggr || 0), 0) / 10;

      if (avgGGR > 0 && newData.ggr > avgGGR * 5) {
        anomalies.push({
          type: 'SPIKE_DETECTION',
          severity: 'HIGH',
          message: `Spike de GGR detectado: ${((newData.ggr / avgGGR - 1) * 100).toFixed(0)}% acima da média`,
          field: 'ggr',
          value: newData.ggr,
          baseline: avgGGR
        });
      }
    }
  }

  // 3. PADRÃO SUSPEITO: DEPOSITOS MUITO MAIORES QUE SAQUES (possível lavagem)
  if (newData.depositos && newData.saques) {
    const depositoSaqueRatio = newData.depositos / (newData.saques || 1);

    if (depositoSaqueRatio > 10 && newData.depositos > 50000) {
      anomalies.push({
        type: 'DEPOSIT_WITHDRAWAL_IMBALANCE',
        severity: 'MEDIUM',
        message: `Depósitos muito maiores que saques: ratio ${depositoSaqueRatio.toFixed(1)}:1`,
        field: 'depositos_saques',
        depositoSaqueRatio: depositoSaqueRatio
      });
    }
  }

  // 4. FLUXO LÍQUIDO NEGATIVO MUITO ALTO (risco de fraude)
  if (newData.fluxoLiquido && newData.fluxoLiquido < -100000) {
    anomalies.push({
      type: 'HIGH_NEGATIVE_CASH_FLOW',
      severity: 'HIGH',
      message: `Fluxo líquido muito negativo: R$ ${newData.fluxoLiquido.toFixed(2)}`,
      field: 'fluxoLiquido',
      value: newData.fluxoLiquido
    });
  }

  // 5. TAXA DE CONVERSÃO DE BÔNUS SUSPEITA
  if (newData.taxaConversaoBonus && newData.taxaConversaoBonus > 80) {
    anomalies.push({
      type: 'HIGH_BONUS_CONVERSION',
      severity: 'MEDIUM',
      message: `Taxa de conversão de bônus muito alta: ${newData.taxaConversaoBonus}%`,
      field: 'taxaConversaoBonus',
      value: newData.taxaConversaoBonus
    });
  }

  // 6. VERIFICAÇÃO DE CONSISTÊNCIA: NGR > GGR (impossível)
  if (newData.ngr && newData.ggr && newData.ngr > newData.ggr) {
    anomalies.push({
      type: 'DATA_INCONSISTENCY',
      severity: 'CRITICAL',
      message: `NGR maior que GGR (inconsistência): NGR=${newData.ngr}, GGR=${newData.ggr}`,
      field: 'ngr_ggr',
      ngr: newData.ngr,
      ggr: newData.ggr
    });
  }

  // Adicionar anomalias ao objeto
  if (anomalies.length > 0) {
    newData.anomalies = anomalies;
    console.warn(`🚨 ANOMALIAS DETECTADAS (${anomalies.length}):`, anomalies.map(a => a.message).join(' | '));
  }

  return newData;
}

/**
 * Valida integridade dos dados antes de salvar
 */
function validateDataIntegrity(data) {
  const validationErrors = [];

  // Verificar campos obrigatórios
  if (!data.timestamp) validationErrors.push('Timestamp ausente');
  if (!data.tipoRelatorio) validationErrors.push('Tipo de relatório ausente');
  if (!data.data) validationErrors.push('Data ausente');
  if (!data.hora) validationErrors.push('Hora ausente');

  // Verificar tipos de dados
  const numericFields = ['ggr', 'ngr', 'turnoverTotal', 'depositos', 'saques'];
  numericFields.forEach(field => {
    if (data[field] !== null && data[field] !== undefined && typeof data[field] !== 'number') {
      validationErrors.push(`Campo ${field} não é numérico`);
    }
  });

  // Verificar intervalos válidos
  if (data.taxaConversaoBonus && (data.taxaConversaoBonus < 0 || data.taxaConversaoBonus > 100)) {
    validationErrors.push('Taxa de conversão fora do intervalo válido (0-100%)');
  }

  if (validationErrors.length > 0) {
    console.error('❌ ERROS DE VALIDAÇÃO:', validationErrors);
    return { valid: false, errors: validationErrors };
  }

  return { valid: true, errors: [] };
}

/**
 * Salvar dados no arquivo JSON com validação e detecção de duplicatas
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

    // VALIDAÇÃO DE INTEGRIDADE
    const validation = validateDataIntegrity(newData);
    if (!validation.valid) {
      console.error('❌ Dados inválidos, não serão salvos:', validation.errors);
      return false;
    }

    // DETECÇÃO DE DUPLICATAS
    if (isDuplicate(newData, allData)) {
      console.warn('⚠️  Duplicata detectada - ignorando registro para evitar poluição de dados');
      return false;
    }

    // CÁLCULO DE DELTAS
    newData = calculateDeltas(newData, allData);

    // DETECÇÃO DE ANOMALIAS
    newData = detectAnomalies(newData, allData);

    // Adicionar metadados de processamento
    newData.metadata = {
      processedAt: new Date().toISOString(),
      dataQuality: validation.valid ? 'VALID' : 'INVALID',
      hasAnomalies: (newData.anomalies && newData.anomalies.length > 0),
      anomalyCount: newData.anomalies ? newData.anomalies.length : 0
    };

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
            // Passar o timestamp da mensagem do Slack para preservar a data/hora original
            const parsedData = parseSlackMessage(message.text, message.ts);
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
        // Só definir incremental se o campo existir no dado original
        if (current.ggr !== undefined && current.ggr !== null) {
          processed.ggrIncremental = current.ggr;
          processed.ggrAcumulado = current.ggr;
        }
        if (current.ngr !== undefined && current.ngr !== null) {
          processed.ngrIncremental = current.ngr;
          processed.ngrAcumulado = current.ngr;
        }
        if (current.depositos !== undefined && current.depositos !== null) {
          processed.depositosIncremental = current.depositos;
          processed.depositosAcumulado = current.depositos;
        }
        if (current.saques !== undefined && current.saques !== null) {
          processed.saquesIncremental = current.saques;
          processed.saquesAcumulado = current.saques;
        }
        if (current.turnoverTotal !== undefined && current.turnoverTotal !== null) {
          processed.turnoverIncremental = current.turnoverTotal;
        }

        previousValues = current;
      } else {
        // Registros subsequentes - calcular diferença apenas se o campo existir em ambos
        if (current.ggr !== undefined && current.ggr !== null && previousValues.ggr !== undefined && previousValues.ggr !== null) {
          processed.ggrIncremental = Math.max(0, current.ggr - previousValues.ggr);
          processed.ggrAcumulado = current.ggr;
        }
        if (current.ngr !== undefined && current.ngr !== null && previousValues.ngr !== undefined && previousValues.ngr !== null) {
          processed.ngrIncremental = Math.max(0, current.ngr - previousValues.ngr);
          processed.ngrAcumulado = current.ngr;
        }
        if (current.depositos !== undefined && current.depositos !== null && previousValues.depositos !== undefined && previousValues.depositos !== null) {
          processed.depositosIncremental = Math.max(0, current.depositos - previousValues.depositos);
          processed.depositosAcumulado = current.depositos;
        }
        if (current.saques !== undefined && current.saques !== null && previousValues.saques !== undefined && previousValues.saques !== null) {
          processed.saquesIncremental = Math.max(0, current.saques - previousValues.saques);
          processed.saquesAcumulado = current.saques;
        }
        if (current.turnoverTotal !== undefined && current.turnoverTotal !== null && previousValues.turnoverTotal !== undefined && previousValues.turnoverTotal !== null) {
          processed.turnoverIncremental = Math.max(0, current.turnoverTotal - previousValues.turnoverTotal);
        }

        previousValues = current;
      }

      result.push(processed);
    });
  });

  return result;
}

/**
 * Função para converter timestamp UTC para UTC-3 (horário de Brasília)
 */
function convertToUTCMinus3(utcTimestamp) {
  const date = new Date(utcTimestamp);
  // Subtrair 3 horas (180 minutos)
  date.setMinutes(date.getMinutes() - 180);
  return date.toISOString();
}

/**
 * Função para enriquecer dados de Performance de Produtos
 * Calcula cassinoNGR e sportsbookNGR proporcionalmente ao GGR
 */
function enrichPerformanceData(data) {
  console.log(`[ENRICH] Processando ${data.length} registros...`);

  return data.map((item, idx) => {
    // Converter timestamp para UTC-3
    const localTimestamp = convertToUTCMinus3(item.timestamp);
    const localDate = new Date(localTimestamp);
    const localHora = `${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}`;
    const localData = `${String(localDate.getDate()).padStart(2, '0')}/${String(localDate.getMonth() + 1).padStart(2, '0')}`;

    const enriched = {
      ...item,
      timestamp: localTimestamp,
      hora: localHora,
      data: localData
    };

    // Se for Performance de Produtos, calcular NGRs separados
    if (item.tipoRelatorio === 'Performance de Produtos' && item.ngr && item.cassinoGGR && item.sportsbookGGR) {
      const totalGGR = item.cassinoGGR + item.sportsbookGGR;

      if (totalGGR > 0) {
        // Calcular NGR proporcional ao GGR
        enriched.cassinoNGR = (item.ngr * item.cassinoGGR) / totalGGR;
        enriched.sportsbookNGR = (item.ngr * item.sportsbookGGR) / totalGGR;

        if (idx === 0) {
          console.log('[ENRICH] Calculando NGRs:');
          console.log(`  NGR Total: ${item.ngr}`);
          console.log(`  Casino NGR: ${enriched.cassinoNGR}`);
          console.log(`  Sportsbook NGR: ${enriched.sportsbookNGR}`);
        }
      } else {
        enriched.cassinoNGR = 0;
        enriched.sportsbookNGR = 0;
      }
    }

    return enriched;
  });
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
  return Object.values(aggregated).map(item => {
    // Calcular média dos incrementais, ou usar acumulado se não houver incrementais
    const avgGgr = item.valores.ggr.length > 0
      ? item.valores.ggr.reduce((a, b) => a + b) / item.valores.ggr.length
      : (item.ggrAcumulado || null);

    const avgNgr = item.valores.ngr.length > 0
      ? item.valores.ngr.reduce((a, b) => a + b) / item.valores.ngr.length
      : (item.ngrAcumulado || null);

    const avgTurnover = item.valores.turnoverTotal.length > 0
      ? item.valores.turnoverTotal.reduce((a, b) => a + b) / item.valores.turnoverTotal.length
      : null;

    const avgDepositos = item.valores.depositos.length > 0
      ? item.valores.depositos.reduce((a, b) => a + b) / item.valores.depositos.length
      : (item.depositosAcumulado || null);

    const avgSaques = item.valores.saques.length > 0
      ? item.valores.saques.reduce((a, b) => a + b) / item.valores.saques.length
      : (item.saquesAcumulado || null);

    return {
      timestamp: item.timestamp,
      hora: item.hora,
      data: item.data,
      tipoRelatorio: item.tipoRelatorio,
      count: item.count,

      // Valores incrementais (diferença do período) ou acumulados se não houver incrementais
      ggr: avgGgr,
      ngr: avgNgr,
      turnoverTotal: avgTurnover,
      depositos: avgDepositos,
      saques: avgSaques,

      // Valores acumulados (para referência)
      ggrAcumulado: item.ggrAcumulado,
      ngrAcumulado: item.ngrAcumulado,
      depositosAcumulado: item.depositosAcumulado,
      saquesAcumulado: item.saquesAcumulado,

    // Outros campos (não são acumulados)
    cassinoGGR: item.cassinoGGR,
    cassinoNGR: item.cassinoNGR,  // Adicionado: NGR calculado do Casino
    cassinoTurnover: item.cassinoTurnover,
    sportsbookGGR: item.sportsbookGGR,
    sportsbookNGR: item.sportsbookNGR,  // Adicionado: NGR calculado do Sportsbook
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
    };
  });
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

    // Enriquecer dados (converter timezone e calcular NGRs separados)
    const enrichedData = enrichPerformanceData(allData);

    // Agregar dados por hora para melhor análise
    const aggregatedData = aggregateDataByHour(enrichedData);

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

/**
 * Endpoint exclusivo para Dashboard de Performance de Produtos
 * Filtra apenas dados de "Performance de Produtos"
 * Inclui breakdown: Casino vs Sportsbook
 */
app.get('/api/dashboard-performance', async (req, res) => {
  try {
    let allData = [];

    // Ler dados existentes
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      console.log('Nenhum dado armazenado ainda');
    }

    // Enriquecer dados (converter timezone e calcular NGRs separados)
    const enrichedData = enrichPerformanceData(allData);

    // Filtrar APENAS Performance de Produtos
    const performanceData = enrichedData.filter(item =>
      item.tipoRelatorio === 'Performance de Produtos'
    );

    // Agregar dados por hora
    const aggregatedData = aggregateDataByHour(performanceData);

    // Calcular estatísticas específicas de Performance
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = brasiliaTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    const todayData = aggregatedData.filter(item => item.data === today);

    // Calcular totais de Casino vs Sportsbook
    const totals = aggregatedData.reduce((acc, item) => {
      acc.cassinoGGR += item.cassinoGGR || 0;
      acc.sportsbookGGR += item.sportsbookGGR || 0;
      acc.cassinoNGR += item.cassinoNGR || 0;
      acc.sportsbookNGR += item.sportsbookNGR || 0;
      acc.cassinoTurnover += item.cassinoTurnover || 0;
      acc.sportsbookTurnover += item.sportsbookTurnover || 0;
      return acc;
    }, {
      cassinoGGR: 0,
      sportsbookGGR: 0,
      cassinoNGR: 0,
      sportsbookNGR: 0,
      cassinoTurnover: 0,
      sportsbookTurnover: 0
    });

    totals.totalGGR = totals.cassinoGGR + totals.sportsbookGGR;
    totals.totalNGR = totals.cassinoNGR + totals.sportsbookNGR;
    totals.totalTurnover = totals.cassinoTurnover + totals.sportsbookTurnover;

    // Calcular shares percentuais
    const shares = {
      casino: {
        ggrPercent: totals.totalGGR > 0 ? (totals.cassinoGGR / totals.totalGGR) * 100 : 0,
        ngrPercent: totals.totalNGR > 0 ? (totals.cassinoNGR / totals.totalNGR) * 100 : 0,
        turnoverPercent: totals.totalTurnover > 0 ? (totals.cassinoTurnover / totals.totalTurnover) * 100 : 0
      },
      sportsbook: {
        ggrPercent: totals.totalGGR > 0 ? (totals.sportsbookGGR / totals.totalGGR) * 100 : 0,
        ngrPercent: totals.totalNGR > 0 ? (totals.sportsbookNGR / totals.totalNGR) * 100 : 0,
        turnoverPercent: totals.totalTurnover > 0 ? (totals.sportsbookTurnover / totals.totalTurnover) * 100 : 0
      }
    };

    // Calcular diferença entre último e penúltimo registro
    let diff = null;
    if (aggregatedData.length >= 2) {
      const ultimo = aggregatedData[0];
      const penultimo = aggregatedData[1];

      diff = {
        casino: {
          ggr: (ultimo.cassinoGGR || 0) - (penultimo.cassinoGGR || 0),
          ngr: (ultimo.cassinoNGR || 0) - (penultimo.cassinoNGR || 0),
          turnover: (ultimo.cassinoTurnover || 0) - (penultimo.cassinoTurnover || 0)
        },
        sportsbook: {
          ggr: (ultimo.sportsbookGGR || 0) - (penultimo.sportsbookGGR || 0),
          ngr: (ultimo.sportsbookNGR || 0) - (penultimo.sportsbookNGR || 0),
          turnover: (ultimo.sportsbookTurnover || 0) - (penultimo.sportsbookTurnover || 0)
        },
        total: {
          ggr: (ultimo.ggr || 0) - (penultimo.ggr || 0),
          ngr: (ultimo.ngr || 0) - (penultimo.ngr || 0),
          turnover: (ultimo.turnoverTotal || 0) - (penultimo.turnoverTotal || 0)
        }
      };
    }

    const stats = {
      totalRegistros: aggregatedData.length,
      registrosHoje: todayData.length,
      ultimoRegistro: aggregatedData.length > 0 ? aggregatedData[0] : null,
      ultimaAtualizacao: brasiliaTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      periodicidade: '15 minutos',
      totals: totals,
      shares: shares,
      diff: diff
    };

    res.json({
      success: true,
      data: aggregatedData,
      stats: stats,
      tipoRelatorio: 'Performance de Produtos',
      message: aggregatedData.length === 0
        ? 'Nenhum dado de Performance disponível ainda.'
        : `${aggregatedData.length} períodos de Performance de Produtos carregados`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint exclusivo para Dashboard do Time de Risco
 * Filtra apenas dados de "Time de Risco"
 * Inclui métricas de gestão de risco e jogadores
 */
app.get('/api/dashboard-risco', async (req, res) => {
  try {
    let allData = [];

    // Ler dados existentes
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      console.log('Nenhum dado armazenado ainda');
    }

    // Enriquecer dados (converter timezone)
    const enrichedData = enrichPerformanceData(allData);

    // Filtrar APENAS Time de Risco
    const riscoData = enrichedData.filter(item =>
      item.tipoRelatorio === 'Time de Risco'
    );

    // Agregar dados por hora
    const aggregatedData = aggregateDataByHour(riscoData);

    // Calcular estatísticas específicas de Risco
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const today = brasiliaTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    const todayData = aggregatedData.filter(item => item.data === today);

    // Calcular totais e médias de métricas de risco
    const totals = aggregatedData.reduce((acc, item) => {
      acc.totalGGR += item.ggr || 0;
      acc.totalNGR += item.ngr || 0;
      acc.totalDepositos += item.depositos || 0;
      acc.totalSaques += item.saques || 0;
      acc.totalFluxoLiquido += item.fluxoLiquido || 0;
      acc.totalBonusConcedidos += item.bonusConcedidos || 0;
      acc.totalCustoBonus += item.custoBonus || 0;
      acc.totalJogadores += item.jogadoresUnicos || 0;
      acc.count++;
      return acc;
    }, {
      totalGGR: 0,
      totalNGR: 0,
      totalDepositos: 0,
      totalSaques: 0,
      totalFluxoLiquido: 0,
      totalBonusConcedidos: 0,
      totalCustoBonus: 0,
      totalJogadores: 0,
      count: 0
    });

    const averages = {
      avgGGR: totals.count > 0 ? totals.totalGGR / totals.count : 0,
      avgNGR: totals.count > 0 ? totals.totalNGR / totals.count : 0,
      avgDepositos: totals.count > 0 ? totals.totalDepositos / totals.count : 0,
      avgSaques: totals.count > 0 ? totals.totalSaques / totals.count : 0,
      avgFluxoLiquido: totals.count > 0 ? totals.totalFluxoLiquido / totals.count : 0,
      avgJogadores: totals.count > 0 ? totals.totalJogadores / totals.count : 0
    };

    // Calcular métricas de eficiência
    const metrics = {
      retencaoLiquida: totals.totalDepositos > 0
        ? ((totals.totalDepositos - totals.totalSaques) / totals.totalDepositos) * 100
        : 0,
      margemNGR: totals.totalGGR > 0
        ? (totals.totalNGR / totals.totalGGR) * 100
        : 0,
      custoBonusPercent: totals.totalNGR > 0
        ? (totals.totalCustoBonus / totals.totalNGR) * 100
        : 0
    };

    const stats = {
      totalRegistros: aggregatedData.length,
      registrosHoje: todayData.length,
      ultimoRegistro: aggregatedData.length > 0 ? aggregatedData[0] : null,
      ultimaAtualizacao: brasiliaTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      periodicidade: '1 hora',
      totals: totals,
      averages: averages,
      metrics: metrics
    };

    res.json({
      success: true,
      data: aggregatedData,
      stats: stats,
      tipoRelatorio: 'Time de Risco',
      message: aggregatedData.length === 0
        ? 'Nenhum dado de Risco disponível ainda.'
        : `${aggregatedData.length} períodos de Time de Risco carregados`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para Dashboard Overview (Visão Geral)
 * Retorna agregações de alto nível de ambos os tipos de relatório
 * Usado para visão executiva consolidada
 */
app.get('/api/dashboard-overview', async (req, res) => {
  try {
    let allData = [];

    // Ler dados existentes
    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      console.log('Nenhum dado armazenado ainda');
    }

    // Enriquecer dados (converter timezone e calcular NGRs)
    const enrichedData = enrichPerformanceData(allData);

    // Separar por tipo
    const performanceData = enrichedData.filter(item => item.tipoRelatorio === 'Performance de Produtos');
    const riscoData = enrichedData.filter(item => item.tipoRelatorio === 'Time de Risco');

    // Agregar cada tipo separadamente
    const aggregatedPerformance = aggregateDataByHour(performanceData);
    const aggregatedRisco = aggregateDataByHour(riscoData);

    // Calcular métricas consolidadas
    const now = new Date();
    const brasiliaTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));

    // Usar dados de RISCO para métricas gerais da plataforma (mais completos e menos frequentes)
    const platformMetrics = aggregatedRisco.reduce((acc, item) => {
      acc.totalGGR += item.ggr || 0;
      acc.totalNGR += item.ngr || 0;
      acc.totalDepositos += item.depositos || 0;
      acc.totalSaques += item.saques || 0;
      acc.count++;
      return acc;
    }, { totalGGR: 0, totalNGR: 0, totalDepositos: 0, totalSaques: 0, count: 0 });

    // Breakdown de Performance (Casino vs Sportsbook)
    const productBreakdown = aggregatedPerformance.reduce((acc, item) => {
      acc.cassinoGGR += item.cassinoGGR || 0;
      acc.sportsbookGGR += item.sportsbookGGR || 0;
      acc.cassinoTurnover += item.cassinoTurnover || 0;
      acc.sportsbookTurnover += item.sportsbookTurnover || 0;
      return acc;
    }, { cassinoGGR: 0, sportsbookGGR: 0, cassinoTurnover: 0, sportsbookTurnover: 0 });

    const totalProductGGR = productBreakdown.cassinoGGR + productBreakdown.sportsbookGGR;

    const overview = {
      platform: {
        ggr: platformMetrics.totalGGR,
        ngr: platformMetrics.totalNGR,
        depositos: platformMetrics.totalDepositos,
        saques: platformMetrics.totalSaques,
        fluxoLiquido: platformMetrics.totalDepositos - platformMetrics.totalSaques,
        margemNGR: platformMetrics.totalGGR > 0
          ? (platformMetrics.totalNGR / platformMetrics.totalGGR) * 100
          : 0
      },
      products: {
        casino: {
          ggr: productBreakdown.cassinoGGR,
          turnover: productBreakdown.cassinoTurnover,
          share: totalProductGGR > 0 ? (productBreakdown.cassinoGGR / totalProductGGR) * 100 : 0
        },
        sportsbook: {
          ggr: productBreakdown.sportsbookGGR,
          turnover: productBreakdown.sportsbookTurnover,
          share: totalProductGGR > 0 ? (productBreakdown.sportsbookGGR / totalProductGGR) * 100 : 0
        }
      },
      counts: {
        performanceRecords: aggregatedPerformance.length,
        riscoRecords: aggregatedRisco.length,
        totalRecords: allData.length
      },
      ultimaAtualizacao: brasiliaTime.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    };

    res.json({
      success: true,
      overview: overview,
      performanceData: aggregatedPerformance.slice(0, 100), // Últimos 100 registros
      riscoData: aggregatedRisco.slice(0, 100), // Últimos 100 registros
      message: `Overview consolidado: ${aggregatedPerformance.length} períodos Performance + ${aggregatedRisco.length} períodos Risco`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para visualizar anomalias detectadas
 * Análise de Risco Financeiro - Detecção de Fraudes
 */
app.get('/api/anomalies', async (req, res) => {
  try {
    let allData = [];

    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      return res.json({
        success: true,
        anomalies: [],
        totalAnomalies: 0,
        message: 'Nenhum dado disponível ainda'
      });
    }

    // Filtrar apenas registros com anomalias
    const recordsWithAnomalies = allData.filter(item =>
      item.anomalies && item.anomalies.length > 0
    );

    // Agrupar por severidade
    const bySeverity = {
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    };

    recordsWithAnomalies.forEach(record => {
      record.anomalies.forEach(anomaly => {
        const anomalyWithContext = {
          ...anomaly,
          timestamp: record.timestamp,
          data: record.data,
          hora: record.hora,
          tipoRelatorio: record.tipoRelatorio
        };

        if (bySeverity[anomaly.severity]) {
          bySeverity[anomaly.severity].push(anomalyWithContext);
        }
      });
    });

    // Estatísticas
    const totalAnomalies = recordsWithAnomalies.reduce((sum, r) => sum + r.anomalies.length, 0);

    res.json({
      success: true,
      totalRecordsWithAnomalies: recordsWithAnomalies.length,
      totalAnomalies: totalAnomalies,
      bySeverity: {
        CRITICAL: bySeverity.CRITICAL.length,
        HIGH: bySeverity.HIGH.length,
        MEDIUM: bySeverity.MEDIUM.length,
        LOW: bySeverity.LOW.length
      },
      anomalies: bySeverity,
      recentAnomalies: recordsWithAnomalies.slice(-10).reverse() // Últimas 10
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para métricas de qualidade e integridade de dados
 */
app.get('/api/data-quality', async (req, res) => {
  try {
    let allData = [];

    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      return res.json({
        success: true,
        quality: 'NO_DATA',
        message: 'Nenhum dado disponível ainda'
      });
    }

    // Estatísticas gerais
    const totalRecords = allData.length;
    const recordsWithAnomalies = allData.filter(r => r.anomalies && r.anomalies.length > 0).length;
    const recordsWithDeltas = allData.filter(r => r.deltas).length;

    // Agrupar por tipo de relatório
    const byType = {
      'Performance de Produtos': allData.filter(r => r.tipoRelatorio === 'Performance de Produtos'),
      'Time de Risco': allData.filter(r => r.tipoRelatorio === 'Time de Risco')
    };

    // Calcular intervalo médio entre atualizações (por tipo)
    const avgIntervals = {};

    Object.keys(byType).forEach(tipo => {
      const records = byType[tipo].sort((a, b) =>
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      if (records.length > 1) {
        const intervals = [];
        for (let i = 1; i < records.length; i++) {
          const diff = (new Date(records[i].timestamp) - new Date(records[i-1].timestamp)) / 1000 / 60; // minutos
          intervals.push(diff);
        }
        avgIntervals[tipo] = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      }
    });

    // Completeness: % de campos preenchidos
    const checkCompleteness = (records, fields) => {
      if (records.length === 0) return 0;

      let totalFields = 0;
      let filledFields = 0;

      records.forEach(record => {
        fields.forEach(field => {
          totalFields++;
          if (record[field] !== null && record[field] !== undefined) {
            filledFields++;
          }
        });
      });

      return (filledFields / totalFields) * 100;
    };

    const performanceCompleteness = checkCompleteness(
      byType['Performance de Produtos'],
      ['ggr', 'ngr', 'turnoverTotal', 'cassinoGGR', 'sportsbookGGR']
    );

    const riscoCompleteness = checkCompleteness(
      byType['Time de Risco'],
      ['depositos', 'saques', 'jogadoresUnicos', 'apostadores', 'depositantes']
    );

    // Calcular score geral de qualidade (0-100)
    const anomalyPenalty = (recordsWithAnomalies / totalRecords) * 20; // Máx 20 pontos de penalidade
    const completenessScore = (performanceCompleteness + riscoCompleteness) / 2 * 0.4; // 40 pontos
    const deltaScore = (recordsWithDeltas / totalRecords) * 40; // 40 pontos

    const qualityScore = Math.max(0, 100 - anomalyPenalty + completenessScore + deltaScore - 40);

    let qualityGrade;
    if (qualityScore >= 90) qualityGrade = 'EXCELENTE';
    else if (qualityScore >= 75) qualityGrade = 'BOM';
    else if (qualityScore >= 60) qualityGrade = 'REGULAR';
    else qualityGrade = 'CRÍTICO';

    res.json({
      success: true,
      qualityScore: Math.round(qualityScore),
      qualityGrade: qualityGrade,
      metrics: {
        totalRecords: totalRecords,
        recordsWithAnomalies: recordsWithAnomalies,
        anomalyRate: ((recordsWithAnomalies / totalRecords) * 100).toFixed(2) + '%',
        recordsWithDeltas: recordsWithDeltas,
        deltaCalculationRate: ((recordsWithDeltas / totalRecords) * 100).toFixed(2) + '%',

        byType: {
          'Performance de Produtos': {
            count: byType['Performance de Produtos'].length,
            avgInterval: avgIntervals['Performance de Produtos'] ?
              `${Math.round(avgIntervals['Performance de Produtos'])} minutos` : 'N/A',
            completeness: `${performanceCompleteness.toFixed(1)}%`,
            expectedInterval: '15 minutos'
          },
          'Time de Risco': {
            count: byType['Time de Risco'].length,
            avgInterval: avgIntervals['Time de Risco'] ?
              `${Math.round(avgIntervals['Time de Risco'])} minutos` : 'N/A',
            completeness: `${riscoCompleteness.toFixed(1)}%`,
            expectedInterval: '60 minutos'
          }
        }
      },
      lastUpdate: allData.length > 0 ? allData[allData.length - 1].timestamp : null
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para visualizar valores incrementais (deltas)
 * Útil para análise temporal de mudanças
 */
app.get('/api/deltas', async (req, res) => {
  try {
    let allData = [];

    try {
      const fileContent = await fs.readFile(DATA_FILE, 'utf8');
      allData = JSON.parse(fileContent);
    } catch (error) {
      return res.json({
        success: true,
        deltas: [],
        message: 'Nenhum dado disponível ainda'
      });
    }

    // Filtrar apenas registros com deltas calculados
    const recordsWithDeltas = allData
      .filter(item => item.deltas)
      .map(item => ({
        timestamp: item.timestamp,
        data: item.data,
        hora: item.hora,
        tipoRelatorio: item.tipoRelatorio,
        deltas: item.deltas,
        // Incluir valores totais para comparação
        totais: {
          ggr: item.ggr,
          ngr: item.ngr,
          turnoverTotal: item.turnoverTotal,
          depositos: item.depositos,
          saques: item.saques
        }
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Mais recentes primeiro

    // Estatísticas dos deltas
    const stats = {
      avgGGRDelta: 0,
      avgNGRDelta: 0,
      maxGGRDelta: { value: 0, timestamp: null },
      minGGRDelta: { value: 0, timestamp: null }
    };

    if (recordsWithDeltas.length > 0) {
      const ggrDeltas = recordsWithDeltas
        .filter(r => !r.deltas.isFirstOfDay)
        .map(r => r.deltas.ggr);

      if (ggrDeltas.length > 0) {
        stats.avgGGRDelta = ggrDeltas.reduce((a, b) => a + b, 0) / ggrDeltas.length;
        stats.maxGGRDelta.value = Math.max(...ggrDeltas);
        stats.minGGRDelta.value = Math.min(...ggrDeltas);

        const maxRecord = recordsWithDeltas.find(r => r.deltas.ggr === stats.maxGGRDelta.value);
        const minRecord = recordsWithDeltas.find(r => r.deltas.ggr === stats.minGGRDelta.value);

        stats.maxGGRDelta.timestamp = maxRecord?.timestamp;
        stats.minGGRDelta.timestamp = minRecord?.timestamp;
      }
    }

    res.json({
      success: true,
      totalRecordsWithDeltas: recordsWithDeltas.length,
      stats: stats,
      deltas: recordsWithDeltas.slice(0, 50), // Retornar últimos 50
      message: `${recordsWithDeltas.length} registros com deltas calculados`
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Endpoint para gerar relatórios periódicos de qualidade de dados
 * Retorna um sumário completo para análise gerencial
 */
app.get('/api/quality-report', async (req, res) => {
  try {
    // Buscar todos os dados
    const [qualityData, anomaliesData, deltasData] = await Promise.all([
      fetch('http://localhost:3001/api/data-quality').then(r => r.json()),
      fetch('http://localhost:3001/api/anomalies').then(r => r.json()),
      fetch('http://localhost:3001/api/deltas').then(r => r.json())
    ].map(p => p.catch(e => ({ error: e.message }))));

    const report = {
      generatedAt: new Date().toISOString(),
      reportDate: new Date().toLocaleDateString('pt-BR'),
      reportTime: new Date().toLocaleTimeString('pt-BR'),

      summary: {
        overallQuality: qualityData.qualityGrade || 'N/A',
        qualityScore: qualityData.qualityScore || 0,
        totalRecords: qualityData.metrics?.totalRecords || 0,
        anomalyRate: qualityData.metrics?.anomalyRate || '0%',
        deltaCalculationRate: qualityData.metrics?.deltaCalculationRate || '0%'
      },

      anomalies: {
        total: anomaliesData.totalAnomalies || 0,
        totalRecordsWithAnomalies: anomaliesData.totalRecordsWithAnomalies || 0,
        bySeverity: anomaliesData.bySeverity || {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0
        },
        criticalIssues: anomaliesData.anomalies?.CRITICAL?.slice(0, 5) || []
      },

      deltas: {
        totalWithDeltas: deltasData.totalRecordsWithDeltas || 0,
        avgGGRDelta: deltasData.stats?.avgGGRDelta || 0,
        maxGGRDelta: deltasData.stats?.maxGGRDelta || { value: 0 },
        minGGRDelta: deltasData.stats?.minGGRDelta || { value: 0 }
      },

      dataIntegrity: {
        performanceReports: qualityData.metrics?.byType?.['Performance de Produtos'] || {},
        riscoReports: qualityData.metrics?.byType?.['Time de Risco'] || {}
      },

      recommendations: []
    };

    // Adicionar recomendações baseadas na análise
    if (report.summary.qualityScore < 75) {
      report.recommendations.push({
        priority: 'HIGH',
        message: 'Score de qualidade abaixo do ideal. Revisar processos de coleta de dados.'
      });
    }

    if (report.anomalies.bySeverity.CRITICAL > 0) {
      report.recommendations.push({
        priority: 'CRITICAL',
        message: `${report.anomalies.bySeverity.CRITICAL} anomalias críticas detectadas. Ação imediata necessária.`
      });
    }

    if (report.anomalies.bySeverity.HIGH > 10) {
      report.recommendations.push({
        priority: 'HIGH',
        message: `${report.anomalies.bySeverity.HIGH} anomalias de alta severidade. Investigação recomendada.`
      });
    }

    res.json({
      success: true,
      report: report
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

DADOS:
1. GET  /api/dashboard-data     → Dados processados para o dashboard
2. GET  /api/data               → Todos os dados brutos armazenados
3. GET  /api/deltas             → Valores incrementais (deltas)

QUALIDADE & RISCO:
4. GET  /api/data-quality       → Métricas de qualidade dos dados
5. GET  /api/anomalies          → Anomalias financeiras detectadas

SLACK:
6. GET  /api/list-channels      → Lista canais do Slack
7. GET  /api/fetch-messages     → Busca mensagens do Slack
8. GET  /api/debug-messages     → Debug de mensagens

OUTROS:
9. GET  /api/health             → Status do servidor
10. POST /api/test-parser       → Testa parser de mensagens
11. DELETE /api/data            → Limpa todos os dados

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
// Triggering pipeline again to test new Docker Hub token
