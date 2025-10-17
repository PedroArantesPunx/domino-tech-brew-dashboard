// ========================================
// ARQUIVO: test-parser.js
// Script para testar o parser localmente
// ========================================

/**
 * Como usar:
 * 1. Salve este arquivo na mesma pasta do server.js
 * 2. Execute: node test-parser.js
 */

// Função de parse (mesma do server.js)
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

// ==================== MENSAGEM DE EXEMPLO ====================

const mensagemExemplo = `Relatório Financeiro hora/hora GERAL • GGR: R$75,996.35 (3.40%) • NGR: R$66,147.23 (2.96%) • Bônus Total: R$9,849.12 FINANCEIRO • Clientes que depositaram: 1,359 • Depósitos: 2,425 • Valor Depositado: R$303,036.89 • Saques: R$284,026.68 • Clientes que sacaram: 471 • Net/Profit: R$19,010.21 (6.27%) ONBOARDING • Cadastros: 109 • KYC Total: 62 • KYC Clientes Novos: 40 • KYC Clientes Antigos: 22 CASSINO • Jogadores: 1,757 • Rodadas: 242,063 • Valor apostado (líq.): R$2,207,055.81 • GGR: R$75,319.47 (3.41%) • Bônus (qtd): 294 • Bônus: R$9,734.66 • NGR: R$65,584.81 (2.97%) • Ticket Médio por jogador: R$1,256.15 SPORTSBOOK • Jogadores: 128 • Apostas: 444 • Valor apostado (líq.): R$25,559.87 • GGR: R$2,076.16 (8.12%) | % Bônus/GGR: 5.51% • Bônus (qtd): 2 • Bônus concedido: R$114.46 • Ganho de bônus: R$1,399.28 • FreeBet: R$0.00 • NGR: R$676.88 (2.65%) • Ticket Médio por jogador: R$199.69Horário da atualização: 16/10/2025 16:00`;

// ==================== EXECUTAR TESTE ====================

console.log('========================================');
console.log('🧪 TESTANDO PARSER DO SLACK');
console.log('========================================\n');

console.log('📄 Mensagem original:');
console.log(mensagemExemplo);
console.log('\n========================================\n');

const resultado = parseSlackMessage(mensagemExemplo);

if (resultado) {
  console.log('✅ PARSE BEM-SUCEDIDO!\n');
  console.log('📊 Dados extraídos:');
  console.log(JSON.stringify(resultado, null, 2));
  
  console.log('\n========================================');
  console.log('📈 RESUMO DOS VALORES:');
  console.log('========================================');
  console.log(`GGR Total: R$ ${resultado.ggr?.toLocaleString('pt-BR') || 'N/A'}`);
  console.log(`NGR Total: R$ ${resultado.ngr?.toLocaleString('pt-BR') || 'N/A'}`);
  console.log(`Depósitos: R$ ${resultado.depositos?.toLocaleString('pt-BR') || 'N/A'}`);
  console.log(`Saques: R$ ${resultado.saques?.toLocaleString('pt-BR') || 'N/A'}`);
  console.log(`Net/Profit: R$ ${resultado.netProfit?.toLocaleString('pt-BR') || 'N/A'}`);
  console.log(`Cadastros: ${resultado.cadastros || 'N/A'}`);
  console.log(`KYC Total: ${resultado.kyc || 'N/A'}`);
  console.log(`Jogadores Cassino: ${resultado.jogadoresCassino || 'N/A'}`);
  console.log(`Jogadores Sportsbook: ${resultado.jogadoresSportsbook || 'N/A'}`);
  console.log(`Ticket Médio Cassino: R$ ${resultado.ticketMedioCassino?.toLocaleString('pt-BR') || 'N/A'}`);
  console.log(`Horário do Relatório: ${resultado.horarioRelatorio || 'N/A'}`);
  
  console.log('\n========================================');
  console.log('✅ Teste concluído com sucesso!');
  console.log('========================================');
} else {
  console.log('❌ ERRO NO PARSE!');
  console.log('Verifique a função parseSlackMessage()');
}

// ==================== FUNÇÃO DE TESTE CUSTOMIZADA ====================

console.log('\n\n========================================');
console.log('💡 DICA: Teste com suas próprias mensagens!');
console.log('========================================');
console.log('\nPara testar com uma mensagem do seu Slack:');
console.log('1. Copie a mensagem completa do Slack');
console.log('2. Substitua a variável "mensagemExemplo" acima');
console.log('3. Execute novamente: node test-parser.js\n');

// ==================== VERIFICAÇÃO DE CAMPOS ====================

console.log('========================================');
console.log('🔍 VERIFICANDO CAMPOS EXTRAÍDOS:');
console.log('========================================\n');

const camposEsperados = [
  'ggr',
  'ngr',
  'depositos',
  'saques',
  'netProfit',
  'cadastros',
  'kyc',
  'jogadoresCassino',
  'jogadoresSportsbook',
  'ticketMedioCassino'
];

let camposFaltando = [];
let camposPresentes = [];

camposEsperados.forEach(campo => {
  if (resultado && resultado[campo] !== undefined && resultado[campo] !== null) {
    camposPresentes.push(campo);
    console.log(`✅ ${campo}: OK`);
  } else {
    camposFaltando.push(campo);
    console.log(`❌ ${campo}: FALTANDO`);
  }
});

console.log('\n========================================');
console.log(`✅ Campos extraídos: ${camposPresentes.length}/${camposEsperados.length}`);

if (camposFaltando.length > 0) {
  console.log(`⚠️  Campos faltando: ${camposFaltando.join(', ')}`);
  console.log('\n💡 Dica: Verifique se o formato da mensagem está correto');
} else {
  console.log('🎉 Todos os campos foram extraídos com sucesso!');
}
console.log('========================================\n');