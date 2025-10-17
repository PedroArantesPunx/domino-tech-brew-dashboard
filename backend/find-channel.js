require('dotenv').config();
const { WebClient } = require('@slack/web-api');

const slackClient = new WebClient(process.env.SLACK_BOT_TOKEN);

async function findChannel() {
    try {
        console.log('🔍 Procurando canal "relatorio-risco"...\n');

        const result = await slackClient.conversations.list({
            types: 'public_channel,private_channel'
        });

        console.log('📋 Canais encontrados:');
        console.log('==========================================');

        result.channels.forEach(channel => {
            console.log(`📌 ${channel.name} → ID: ${channel.id}`);
            if (channel.name === 'relatorio-risco') {
                console.log(`\n🎯 ENCONTRADO! Canal "relatorio-risco"`);
                console.log(`📝 ID: ${channel.id}`);
                console.log(`\n✏️  Configure no .env:`);
                console.log(`CHANNEL_ID=${channel.id}`);
            }
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);

        if (error.message.includes('missing_scope')) {
            console.log('\n🔧 Solução: Adicione estas permissões no Slack App:');
            console.log('- channels:read');
            console.log('- groups:read');
            console.log('\nE reinstale o app no workspace.');
        }
    }
}

findChannel();