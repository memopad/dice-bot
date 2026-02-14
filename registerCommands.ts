// src/registerCommands.ts
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config } from 'dotenv';

config();

const commands = [
    new SlashCommandBuilder().setName('r').setDescription('주사위 굴림 (예: 3d6+1)'),
    new SlashCommandBuilder().setName('sr').setDescription('시크릿 주사위 굴림'),
    new SlashCommandBuilder().setName('c').setDescription('계산 또는 무작위 선택'),
    new SlashCommandBuilder().setName('sc').setDescription('시크릿 계산 또는 무작위 선택'),
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN!);

(async () => {
    try {
        console.log('🛠️ 슬래시 명령 등록 중...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID!), // ✅ 전역 등록
            { body: commands }
        );

        console.log('✅ 등록 완료!');
    } catch (err) {
        console.error('등록 실패:', err);
    }
})();
