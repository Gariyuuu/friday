import "server-only";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

export type MemoryCategory = "preference" | "project" | "episodic";

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  content: string;
  createdAt: string;
}

/**
 * A local SQLite file under ~/.friday — not the repo, not a hosted DB (spec §30
 * calls for Postgres/pgvector eventually, but that's real infra for a personal
 * single-user app that doesn't need it yet). Uses Node's built-in node:sqlite
 * (stable since Node 22+, no extra dependency, no native build step).
 */
const DB_DIR = path.join(os.homedir(), ".friday");
const DB_PATH = path.join(DB_DIR, "memory.db");

let db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (db) return db;
  mkdirSync(DB_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  return db;
}

export function addMemory(category: MemoryCategory, content: string): MemoryRecord {
  const record: MemoryRecord = {
    id: randomUUID(),
    category,
    content,
    createdAt: new Date().toISOString(),
  };
  getDb()
    .prepare("INSERT INTO memories (id, category, content, created_at) VALUES (?, ?, ?, ?)")
    .run(record.id, record.category, record.content, record.createdAt);
  return record;
}

function rowsToRecords(rows: unknown[]): MemoryRecord[] {
  return (rows as { id: string; category: string; content: string; created_at: string }[]).map(
    (row) => ({
      id: row.id,
      category: row.category as MemoryCategory,
      content: row.content,
      createdAt: row.created_at,
    }),
  );
}

export function listMemories(): MemoryRecord[] {
  const rows = getDb().prepare("SELECT * FROM memories ORDER BY created_at DESC").all();
  return rowsToRecords(rows);
}

export function searchMemories(query: string): MemoryRecord[] {
  const rows = getDb()
    .prepare("SELECT * FROM memories WHERE content LIKE ? ORDER BY created_at DESC LIMIT 10")
    .all(`%${query}%`);
  return rowsToRecords(rows);
}

export function deleteMemory(id: string): void {
  getDb().prepare("DELETE FROM memories WHERE id = ?").run(id);
}

export function clearMemories(category?: MemoryCategory): void {
  if (category) {
    getDb().prepare("DELETE FROM memories WHERE category = ?").run(category);
  } else {
    getDb().exec("DELETE FROM memories");
  }
}
