import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { parseCommand } from './parser';
import { handleRollCommand } from './rollHandler';
import { parseCalcCommand } from './calcHandler';

config(); // .env 로딩

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const parsed = parseCommand(content);
  if (!parsed) return;

    let reply: string | undefined;


    if (parsed.type.includes('roll')) {
        reply = handleRollCommand(parsed.body);
    } else if (parsed.type.includes('calc')) {
        const result = parseCalcCommand(parsed.body);
        reply = typeof result === 'string' ? result : result.result;
    }

    if (parsed.type.startsWith('secret')) {
        reply = `||${reply}||`; // 디스코드 스포일러 처리
    }

    // ❗ 여기가 중요합니다
    if (reply !== undefined) {
        await message.reply(reply);
    }

});

client.login(process.env.BOT_TOKEN);

import http from 'http';

const PORT = process.env.PORT || 3000;
http.createServer((_, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('🎲 주사위 봇 정상 작동 중');
}).listen(PORT, () => {
    console.log(`🌐 Render용 HTTP 서버 실행됨 (포트 ${PORT})`);
});

