const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Iniciando teste do navegador...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capturar logs do console
  const consoleLogs = [];
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    consoleLogs.push({ type, text });

    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'log' ? '📝' : 'ℹ️';
    console.log(`${emoji} [${type.toUpperCase()}] ${text}`);
  });

  // Capturar erros de página
  page.on('pageerror', error => {
    console.log(`❌ [PAGE ERROR] ${error.message}`);
  });

  // Capturar requisições que falharam
  page.on('requestfailed', request => {
    console.log(`❌ [REQUEST FAILED] ${request.url()}`);
  });

  // Capturar respostas da API
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('/api/')) {
      console.log(`📡 [API] ${response.status()} ${url}`);
    }
  });

  try {
    console.log('🌐 Acessando http://localhost...\n');
    await page.goto('http://localhost', {
      waitUntil: 'networkidle2',
      timeout: 10000
    });

    console.log('\n⏳ Aguardando 3 segundos para a página carregar completamente...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Capturar o título da página
    const title = await page.title();
    console.log(`📄 Título da página: ${title}`);

    // Verificar se há conteúdo visível
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log(`\n📊 Conteúdo visível (primeiros 500 caracteres):\n${bodyText.substring(0, 500)}\n`);

    // Verificar se elementos específicos existem
    const hasHeader = await page.$('h1');
    const hasButton = await page.$('button');
    const hasTable = await page.$('table');

    console.log('🔍 Elementos encontrados:');
    console.log(`  - Header (h1): ${hasHeader ? '✅' : '❌'}`);
    console.log(`  - Botão: ${hasButton ? '✅' : '❌'}`);
    console.log(`  - Tabela: ${hasTable ? '✅' : '❌'}`);

    // Capturar screenshot
    await page.screenshot({ path: 'dashboard-screenshot.png', fullPage: true });
    console.log('\n📸 Screenshot salvo em: dashboard-screenshot.png');

    // Resumo dos logs
    console.log('\n📋 Resumo dos logs:');
    const errors = consoleLogs.filter(l => l.type === 'error');
    const warnings = consoleLogs.filter(l => l.type === 'warning');

    console.log(`  - Total de mensagens: ${consoleLogs.length}`);
    console.log(`  - Erros: ${errors.length}`);
    console.log(`  - Warnings: ${warnings.length}`);

    if (errors.length > 0) {
      console.log('\n❌ ERROS ENCONTRADOS:');
      errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.text}`);
      });
    }

    if (warnings.length > 0) {
      console.log('\n⚠️  WARNINGS ENCONTRADOS:');
      warnings.forEach((warn, idx) => {
        console.log(`  ${idx + 1}. ${warn.text}`);
      });
    }

  } catch (error) {
    console.error('❌ Erro ao executar teste:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Teste finalizado!');
  }
})();
