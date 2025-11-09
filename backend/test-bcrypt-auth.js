#!/usr/bin/env node
/**
 * Teste de autenticação com bcrypt
 * Simula o fluxo de login
 */

const bcrypt = require('bcryptjs');

// Hash configurado (senha: domino2024)
const storedHash = '$2a$10$3dDoVFA71A88A16QmpfXCeGeoPWHuLBM71kmI.dDD28Fl9K7j0j66';

async function testAuth() {
  console.log('🔐 Testando autenticação com bcrypt\n');

  // Teste 1: Senha correta
  console.log('Teste 1: Senha correta (domino2024)');
  const correctPassword = 'domino2024';
  const match1 = await bcrypt.compare(correctPassword, storedHash);
  console.log(`Resultado: ${match1 ? '✅ PASSOU' : '❌ FALHOU'}`);
  console.log('');

  // Teste 2: Senha incorreta
  console.log('Teste 2: Senha incorreta (senha_errada)');
  const wrongPassword = 'senha_errada';
  const match2 = await bcrypt.compare(wrongPassword, storedHash);
  console.log(`Resultado: ${!match2 ? '✅ PASSOU (bloqueou corretamente)' : '❌ FALHOU (permitiu senha incorreta)'}`);
  console.log('');

  // Teste 3: Senha em branco
  console.log('Teste 3: Senha em branco');
  const emptyPassword = '';
  const match3 = await bcrypt.compare(emptyPassword, storedHash);
  console.log(`Resultado: ${!match3 ? '✅ PASSOU (bloqueou corretamente)' : '❌ FALHOU (permitiu senha vazia)'}`);
  console.log('');

  // Resumo
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Resumo dos Testes');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (match1 && !match2 && !match3) {
    console.log('✅ TODOS OS TESTES PASSARAM!');
    console.log('✅ Autenticação com bcrypt funcionando corretamente!');
    process.exit(0);
  } else {
    console.log('❌ ALGUNS TESTES FALHARAM!');
    console.log(`   Teste 1 (senha correta): ${match1 ? 'PASSOU' : 'FALHOU'}`);
    console.log(`   Teste 2 (senha incorreta): ${!match2 ? 'PASSOU' : 'FALHOU'}`);
    console.log(`   Teste 3 (senha vazia): ${!match3 ? 'PASSOU' : 'FALHOU'}`);
    process.exit(1);
  }
}

testAuth().catch(err => {
  console.error('❌ Erro ao executar testes:', err);
  process.exit(1);
});
