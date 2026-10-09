import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// DB 파일은 디스크에 남으니까 재시작해도 유지됨
const DB_PATH = path.join(DATA_DIR, 'bot.db');

export const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(title, category)
  );

  CREATE INDEX IF NOT EXISTS idx_recommendations_category
  ON recommendations(category);

  CREATE TABLE IF NOT EXISTS timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT,
    channel_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    memo TEXT,
    due_at INTEGER NOT NULL,      -- UNIX epoch ms
    created_at INTEGER NOT NULL,  -- UNIX epoch ms
    fired_at INTEGER              -- NULL이면 아직 안 울림
  );

  CREATE INDEX IF NOT EXISTS idx_timers_due
  ON timers (fired_at, due_at);

  CREATE INDEX IF NOT EXISTS idx_timers_user
  ON timers (user_id, fired_at, due_at);
`);