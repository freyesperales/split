import "server-only";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

declare global {
  // eslint-disable-next-line no-var
  var __split_db: Database.Database | undefined;
}

function open(): Database.Database {
  const dir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(path.join(dir, "split.db"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rooms (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      currency TEXT NOT NULL,
      members_json TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      room_code TEXT NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
      paid_by TEXT NOT NULL,
      amount_minor INTEGER NOT NULL,
      participants_json TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_expenses_room ON expenses(room_code, created_at DESC);
  `);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__split_db) globalThis.__split_db = open();
  return globalThis.__split_db;
}

export type RoomRow = {
  code: string;
  name: string;
  currency: string;
  members_json: string;
  created_at: number;
  expires_at: number;
};

export type ExpenseRow = {
  id: string;
  room_code: string;
  paid_by: string;
  amount_minor: number;
  participants_json: string;
  description: string | null;
  created_at: number;
};
