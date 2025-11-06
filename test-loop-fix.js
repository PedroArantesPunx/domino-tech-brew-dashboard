const puppeteer = require('puppeteer');

(async () => {
  console.log('🧪 Testando correção do loop infinito...\n');

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  let apiCallCount = 0;
  let consoleLogs = [];

  // Monitorar requisições à API
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      apiCallCount++;
      const endpoint = url.split('/api/')[1];
      console.log(`📡 [${apiCallCount}] API Call: ${endpoint}`);
    }
  });

  // Monitorar console
  page.on('console', msg => {
    const text = msg.text();
    if (text.includes('ERROR') || text.includes('Warning') || text.includes('loop')) {
      consoleLogs.push(text);
      console.log(`⚠️  Console: ${text}`);
    }
  });

  try {
    console.log('🌐 Acessando http://localhost:3000...\n');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle0', timeout: 15000 });

    console.log('\n⏳ Aguardando 10 segundos para detectar loops...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log(`\n📊 Resultado:`);
    console.log(`  - Total de chamadas API: ${apiCallCount}`);
    console.log(`  - Logs de erro/warning: ${consoleLogs.length}`);

    if (apiCallCount > 20) {
      console.log('\n❌ FALHOU: Muitas chamadas API detectadas (possível loop infinito)');
      process.exit(1);
    } else {
      console.log('\n✅ SUCESSO: Número normal de chamadas API');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
