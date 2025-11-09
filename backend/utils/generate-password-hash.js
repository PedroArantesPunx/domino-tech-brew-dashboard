#!/usr/bin/env node
/**
 * Script para gerar hash de senhas usando bcrypt
 * Uso: node utils/generate-password-hash.js "sua_senha_aqui"
 */

const bcrypt = require('bcryptjs');

// Pegar senha do argumento da linha de comando
const password = process.argv[2];

if (!password) {
  console.error('❌ Erro: Forneça a senha como argumento');
  console.log('');
  console.log('Uso: node utils/generate-password-hash.js "sua_senha_aqui"');
  console.log('');
  console.log('Exemplo:');
  console.log('  node utils/generate-password-hash.js "domino2024"');
  process.exit(1);
}

// Gerar hash (salt rounds = 10 é um bom balanceamento entre segurança e performance)
const saltRounds = 10;

console.log('🔐 Gerando hash para a senha...\n');

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('❌ Erro ao gerar hash:', err);
    process.exit(1);
  }

  console.log('✅ Hash gerado com sucesso!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Hash (copie este valor):');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(hash);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📝 Como usar:\n');
  console.log('1. No arquivo server.js, atualize o objeto USERS:');
  console.log('   passwordHash: "$HASH_AQUI"\n');
  console.log('2. Ou configure no arquivo .env:');
  console.log(`   ADMIN_PASSWORD_HASH="${hash}"\n`);
  console.log('3. Reinicie o backend:');
  console.log('   docker compose restart backend\n');

  // Teste de verificação
  bcrypt.compare(password, hash, (err, result) => {
    if (err) {
      console.error('❌ Erro ao verificar hash:', err);
      return;
    }

    if (result) {
      console.log('✅ Hash verificado com sucesso!');
    } else {
      console.log('❌ Erro: Hash não corresponde à senha original');
    }
  });
});
