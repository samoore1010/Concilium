import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, "../data/concilium.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(DB_PATH);
    fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
    console.log(`[DB] SQLite ready at ${DB_PATH}`);
  }
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_type TEXT,
      personas TEXT,
      transcript TEXT,
      feedback TEXT,
      prosody_data TEXT,
      speech_metrics TEXT,
      overall_score REAL,
      word_count INTEGER,
      duration_seconds INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
  `);

  // Seed admin account for testing
  seedAdminUser(db);
}

function seedAdminUser(db: Database.Database): void {
  const ADMIN_EMAIL = "admin@concilium.dev";
  const ADMIN_PASSWORD = "admin123";
  const ADMIN_NAME = "Admin";
  const ADMIN_ID = "00000000-0000-0000-0000-000000000001";

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);
  if (existing) return;

  const passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)").run(
    ADMIN_ID, ADMIN_EMAIL, ADMIN_NAME, passwordHash
  );
  console.log(`[DB] Seeded admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}
