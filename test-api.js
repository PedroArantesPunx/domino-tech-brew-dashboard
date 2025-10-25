// Teste simples da API
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 80,
  path: '/api/dashboard-data',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Status:', res.statusCode);
      console.log('✅ Success:', json.success);
      console.log('✅ Total de registros:', json.data?.length || 0);

      if (json.data && json.data.length > 0) {
        const primeiro = json.data[0];
        console.log('\n📊 Primeiro registro:');
        console.log('  - Tipo:', primeiro.tipoRelatorio);
        console.log('  - GGR:', primeiro.ggr);
        console.log('  - Data:', primeiro.data);

        // Verificar se há valores inválidos que podem causar erro no toLocaleString
        const testarNumero = (valor, nome) => {
          if (valor !== null && valor !== undefined) {
            if (typeof valor !== 'number') {
              console.log(`⚠️  ${nome} não é number:`, typeof valor, valor);
            } else if (isNaN(valor)) {
              console.log(`⚠️  ${nome} é NaN`);
            } else if (!isFinite(valor)) {
              console.log(`⚠️  ${nome} é Infinity`);
            } else {
              try {
                const formatted = valor.toLocaleString('pt-BR', {minimumFractionDigits: 2});
                console.log(`✅ ${nome} OK:`, formatted);
              } catch (e) {
                console.log(`❌ Erro ao formatar ${nome}:`, e.message);
              }
            }
          }
        };

        console.log('\n🔍 Testando formatação de números:');
        testarNumero(primeiro.ggr, 'GGR');
        testarNumero(primeiro.ngr, 'NGR');
        testarNumero(primeiro.depositos, 'Depósitos');
        testarNumero(primeiro.turnoverTotal, 'Turnover');
      }

      if (json.stats?.ultimoAlerta) {
        console.log('\n📈 Último alerta existe');
        const ultimo = json.stats.ultimoAlerta;
        console.log('  - Tipo:', ultimo.tipoRelatorio);
        console.log('  - Data:', ultimo.data);
        console.log('  - Hora:', ultimo.hora);
      }

    } catch (e) {
      console.error('❌ Erro ao parsear JSON:', e.message);
      console.log('Dados brutos:', data.substring(0, 200));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Erro na requisição:', e.message);
});

req.end();
