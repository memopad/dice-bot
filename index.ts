import { Client, GatewayIntentBits } from 'discord.js';
import { config } from 'dotenv';
import { parseCommand } from './parser';
import { handleRollCommand } from './rollHandler';
import { parseCalcCommand } from './calcHandler';
import { handleOmikujiCommand } from './omikujiHandler';
import { pickMenu, addMenu, removeMenu, listMenus } from './menuHandler';
import { handleTimerCommand } from './timerHandler';
import { rescheduleNextTimer } from './timerService';
import { handleTimerCreate, handleTimerList, handleTimerCancel, handleTimerClear } from './timerHandler';

config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.on('ready', () => {
  console.log(`✅ Logged in as ${client.user?.tag}`);
  rescheduleNextTimer(client);
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
  } else if (parsed.type === 'omikuji') {
    reply = handleOmikujiCommand();
  } else if (parsed.type === 'menu') {
    reply = pickMenu();
  } else if (parsed.type === 'menu-add') {
    reply = addMenu(parsed.body);
  } else if (parsed.type === 'menu-remove') {
    reply = removeMenu(parsed.body);
  } else if (parsed.type === 'menu-list') {
    reply = listMenus();
  } else if (parsed.type === 'timer') {
    reply = handleTimerCreate(client, message, parsed.body);
  } else if (parsed.type === 'timer-list') {
    reply = handleTimerList(message);
  } else if (parsed.type === 'timer-cancel') {
    reply = handleTimerCancel(client, message, parsed.body);
  } else if (parsed.type === 'timer-clear') {
    reply = handleTimerClear(client, message);
  }

  if (parsed.type.startsWith('secret')) {
    reply = `||${reply}||`;
  }

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

