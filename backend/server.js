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
    const data = {
      timestamp: new Date().toISOString(),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
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
 * Buscar mensagens do Slack
 */
async function fetchSlackMessages() {
  try {
    console.log('📥 Buscando mensagens do Slack...');

    const result = await slackClient.conversations.history({
      channel: CHANNEL_ID,
      limit: 100 // Buscar últimas 100 mensagens
    });

    if (result.messages && result.messages.length > 0) {
      console.log(`✅ Encontradas ${result.messages.length} mensagens`);

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
    } else {
      console.log('⚠️ Nenhuma mensagem encontrada');
    }

    return result.messages;
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

    // Calcular estatísticas
    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const todayData = allData.filter(item => item.data === today);

    const stats = {
      totalAlertas: allData.length,
      alertasHoje: todayData.length,
      ultimoAlerta: allData.length > 0 ? allData[allData.length - 1] : null,
      ultimaAtualizacao: new Date().toLocaleString('pt-BR')
    };

    res.json({
      success: true,
      data: allData,
      stats: stats,
      message: allData.length === 0 ? 'Nenhum dado disponível ainda. Aguardando mensagens do Slack.' : 'Dados carregados com sucesso'
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