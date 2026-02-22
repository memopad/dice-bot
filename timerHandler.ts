import type { Client, Message } from 'discord.js';
import { db } from './db';
import { rescheduleNextTimer } from './timerService';

type ParsedDuration = { ms: number; human: string };

function parseDurationKorean(input: string): ParsedDuration | null {
  const s = input.trim();
  if (!s) return null;

  const re = /(\d+)\s*(초|분|시간|s|m|h)(?=\s|$)/gi;
  let totalMs = 0;
  let matched = false;

  for (const m of s.matchAll(re)) {
    matched = true;
    const n = Number(m[1]);
    const unit = m[2].toLowerCase();
    if (!Number.isFinite(n) || n <= 0) continue;

    if (unit === '초' || unit === 's') totalMs += n * 1000;
    else if (unit === '분' || unit === 'm') totalMs += n * 60_000;
    else if (unit === '시간' || unit === 'h') totalMs += n * 3_600_000;
  }

  if (!matched || totalMs <= 0) return null;

  const sec = Math.floor(totalMs / 1000);
  const h = Math.floor(sec / 3600);
  const mi = Math.floor((sec % 3600) / 60);
  const se = sec % 60;

  const parts: string[] = [];
  if (h) parts.push(`${h}시간`);
  if (mi) parts.push(`${mi}분`);
  if (se) parts.push(`${se}초`);
  const human = parts.join(' ') || `${sec}초`;

  return { ms: totalMs, human };
}

function stripDurationTokens(body: string) {
  return body.replace(/(\d+)\s*(초|분|시간|s|m|h)(?=\s|$)/gi, '').trim();
}

function formatRemain(ms: number) {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  const parts: string[] = [];
  if (h) parts.push(`${h}시간`);
  if (m) parts.push(`${m}분`);
  if (s || parts.length === 0) parts.push(`${s}초`);
  return parts.join(' ');
}

/** /t 5분 (메모) */
export function handleTimerCreate(client: Client, message: Message, body: string): string {
  const parsed = parseDurationKorean(body);
  if (!parsed) {
    return '❌ 형식: `/t 10초`, `/t 5분`, `/t 1시간 30분`, `/t 5분 빨래`';
  }

  const memo = stripDurationTokens(body);
  const dueAt = Date.now() + parsed.ms;

  const MAX_MS = 365 * 24 * 60 * 60 * 1000; // 1년
  if (parsed.ms > MAX_MS) return '❌ 너무 길어요. 최대 1년까지만 가능해요.';

  const info = db.prepare(`
    INSERT INTO timers (guild_id, channel_id, message_id, user_id, memo, due_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    message.guildId ?? null,
    message.channelId,
    message.id,
    message.author.id,
    memo || null,
    dueAt,
    Date.now()
  );

  // 방금 만든 게 가장 빠른 타이머일 수 있으니 재스케줄
  rescheduleNextTimer(client);

  const timerId = Number(info.lastInsertRowid);
  return `✅ 타이머 설정됨 (#${timerId}) **${parsed.human}** 뒤에 알림${memo ? ` (메모: ${memo})` : ''}`;
}

/** /tlist (내 남은 타이머 목록) */
export function handleTimerList(message: Message): string {
  const rows = db.prepare(`
    SELECT id, memo, due_at
    FROM timers
    WHERE user_id = ? AND fired_at IS NULL
    ORDER BY due_at ASC
    LIMIT 20
  `).all(message.author.id) as { id: number; memo: string | null; due_at: number }[];

  if (rows.length === 0) return '📭 남아있는 타이머가 없어요.';

  const now = Date.now();
  const lines = rows.map(r => {
    const remain = formatRemain(r.due_at - now);
    const memo = r.memo?.trim() ? ` - ${r.memo.trim()}` : '';
    return `• #${r.id} (남은시간: ${remain})${memo}`;
  });

  return `⏳ 내 타이머(최대 20개 표시):\n${lines.join('\n')}\n\n취소: \`/tcancel 타이머번호\`  (예: /tcancel 12)`;
}

/** /tcancel 12 */
export function handleTimerCancel(client: Client, message: Message, body: string): string {
  const id = Number(body.trim());
  if (!Number.isFinite(id) || id <= 0) return '❌ 형식: `/tcancel 12`';

  // 내 타이머만 취소 가능
  const row = db.prepare(`
    SELECT id, due_at, memo
    FROM timers
    WHERE id = ? AND user_id = ? AND fired_at IS NULL
  `).get(id, message.author.id) as { id: number; due_at: number; memo: string | null } | undefined;

  if (!row) return `❌ 취소할 수 없어요. (#${id}가 없거나 이미 끝났거나 내 타이머가 아닐 수 있어요)`;

  db.prepare(`UPDATE timers SET fired_at = ? WHERE id = ? AND fired_at IS NULL`).run(Date.now(), id);

  // 혹시 이게 “다음으로 울릴 타이머”였을 수 있으니 재스케줄
  rescheduleNextTimer(client);

  const memo = row.memo?.trim() ? ` (메모: ${row.memo.trim()})` : '';
  return `🗑️ 타이머 취소됨: #${id}${memo}`;
}

/** /tclear (내 남은 타이머 전부 취소) */
export function handleTimerClear(client: Client, message: Message): string {
  const info = db.prepare(`
    UPDATE timers
    SET fired_at = ?
    WHERE user_id = ? AND fired_at IS NULL
  `).run(Date.now(), message.author.id);

  rescheduleNextTimer(client);

  const n = info.changes ?? 0;
  if (n === 0) return '📭 취소할 타이머가 없어요.';
  return `🧹 내 타이머 ${n}개를 전부 취소했어요.`;
}