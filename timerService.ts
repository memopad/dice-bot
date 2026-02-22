import type { Client, TextBasedChannel } from 'discord.js';
import { db } from './db';

let currentTimeout: NodeJS.Timeout | null = null;
const MAX_SET_TIMEOUT_MS = 2_000_000_000; // 약 23일 (setTimeout 안전 범위)

function nowMs() {
  return Date.now();
}

function fetchNextTimer():
  | { id: number; channel_id: string; message_id: string; user_id: string; memo: string | null; due_at: number }
  | null {
  const row = db.prepare(`
    SELECT id, channel_id, message_id, user_id, memo, due_at
    FROM timers
    WHERE fired_at IS NULL
    ORDER BY due_at ASC
    LIMIT 1
  `).get();

  return (row as any) ?? null;
}

function markFired(id: number) {
  db.prepare(`UPDATE timers SET fired_at = ? WHERE id = ? AND fired_at IS NULL`).run(nowMs(), id);
}

async function fireTimer(client: Client, timer: NonNullable<ReturnType<typeof fetchNextTimer>>) {
  try {
    const channel = (await client.channels.fetch(timer.channel_id)) as TextBasedChannel | null;
    if (!channel) return;

    const base = `⏰ <@${timer.user_id}> 타이머 끝!`;
    const content = timer.memo?.trim()
      ? `${base}\n메모: **${timer.memo.trim()}**`
      : base;

    await channel.send({
      content,
      reply: { messageReference: timer.message_id },
    });
  } catch (e) {
    console.error('timer fire failed:', e);
  }
}

export function rescheduleNextTimer(client: Client) {
  if (currentTimeout) {
    clearTimeout(currentTimeout);
    currentTimeout = null;
  }

  const next = fetchNextTimer();
  if (!next) return;

  const delay = next.due_at - nowMs();
  const safeDelay = Math.max(0, Math.min(delay, MAX_SET_TIMEOUT_MS));

  currentTimeout = setTimeout(async () => {
    // 혹시 안전 딜레이로 쪼갰는데 due가 아직이면 다시 스케줄
    const refreshed = db.prepare(`
      SELECT id, channel_id, message_id, user_id, memo, due_at
      FROM timers
      WHERE id = ? AND fired_at IS NULL
    `).get(next.id) as any;

    if (!refreshed) {
      rescheduleNextTimer(client);
      return;
    }

    if (refreshed.due_at > nowMs()) {
      rescheduleNextTimer(client);
      return;
    }

    markFired(refreshed.id);
    await fireTimer(client, refreshed);
    rescheduleNextTimer(client);
  }, safeDelay);
}