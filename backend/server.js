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
 * A mensagem vem no formato que você mostrou
 */
function parseSlackMessage(text) {
  try {
    const data = {
      timestamp: new Date().toISOString(),
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      data: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    };

    // Extrair GGR Geral
    const ggrMatch = text.match(/GGR:\s*R\$([0-9,\.]+)/);
    if (ggrMatch) {
      data.ggr = parseFloat(ggrMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extrair NGR Geral
    const ngrMatch = text.match(/NGR:\s*R\$([0-9,\.]+)/);
    if (ngrMatch) {
      data.ngr = parseFloat(ngrMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extrair Depósitos
    const depositosMatch = text.match(/Valor Depositado:\s*R\$([0-9,\.]+)/);
    if (depositosMatch) {
      data.depositos = parseFloat(depositosMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extrair Saques
    const saquesMatch = text.match(/Saques:\s*R\$([0-9,\.]+)/);
    if (saquesMatch) {
      data.saques = parseFloat(saquesMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extrair Net/Profit
    const netProfitMatch = text.match(/Net\/Profit:\s*R\$([0-9,\.]+)/);
    if (netProfitMatch) {
      data.netProfit = parseFloat(netProfitMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extrair Cadastros
    const cadastrosMatch = text.match(/Cadastros:\s*([0-9,\.]+)/);
    if (cadastrosMatch) {
      data.cadastros = parseInt(cadastrosMatch[1].replace(/\./g, ''));
    }

    // Extrair KYC Total
    const kycMatch = text.match(/KYC Total:\s*([0-9,\.]+)/);
    if (kycMatch) {
      data.kyc = parseInt(kycMatch[1].replace(/\./g, ''));
    }

    // Extrair Jogadores Cassino
    const jogadoresCassinoMatch = text.match(/CASSINO[\s\S]*?Jogadores:\s*([0-9,\.]+)/);
    if (jogadoresCassinoMatch) {
      data.jogadoresCassino = parseInt(jogadoresCassinoMatch[1].replace(/\./g, ''));
    }

    // Extrair Jogadores Sportsbook
    const jogadoresSportsbookMatch = text.match(/SPORTSBOOK[\s\S]*?Jogadores:\s*([0-9,\.]+)/);
    if (jogadoresSportsbookMatch) {
      data.jogadoresSportsbook = parseInt(jogadoresSportsbookMatch[1].replace(/\./g, ''));
    }

    // Extrair Ticket Médio Cassino
    const ticketMedioMatch = text.match(/Ticket Médio por jogador:\s*R\$([0-9,\.]+)/);
    if (ticketMedioMatch) {
      data.ticketMedioCassino = parseFloat(ticketMedioMatch[1].replace(/\./g, '').replace(',', '.'));
    }

    // Extrair horário da atualização do relatório
    const horarioMatch = text.match(/Horário da atualização:\s*(.+)/);
    if (horarioMatch) {
      data.horarioRelatorio = horarioMatch[1].trim();
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
        if (message.text && message.text.includes('Relatório Financeiro')) {
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
    
    // Se o erro for relacionado ao token ou canal
    if (error.message.includes('invalid_auth')) {
      console.log('\n⚠️ ERRO: Token inválido. Verifique se você configurou o SLACK_BOT_TOKEN corretamente.');
    } else if (error.message.includes('channel_not_found')) {
      console.log('\n⚠️ ERRO: Canal não encontrado. Execute o endpoint /api/list-channels para descobrir o ID correto.');
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
    res.status(500).json({
      success: false,
      error: error.message
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