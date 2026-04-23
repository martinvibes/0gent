import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

const DATA_DIR = join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db: Database.Database = new Database(join(DATA_DIR, "0gent.db"));
db.pragma("journal_mode = WAL");

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS phone_numbers (
      id TEXT PRIMARY KEY,
      phone_number TEXT UNIQUE NOT NULL,
      country TEXT NOT NULL,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      provisioned_at TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_phone_owner ON phone_numbers(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sms_messages (
      id TEXT PRIMARY KEY,
      phone_number_id TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('inbound', 'outbound')),
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      body TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (phone_number_id) REFERENCES phone_numbers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_sms_phone ON sms_messages(phone_number_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_inboxes (
      id TEXT PRIMARY KEY,
      address TEXT UNIQUE NOT NULL,
      local_part TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      created_at TEXT NOT NULL,
      active INTEGER DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS idx_email_owner ON email_inboxes(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      server_type TEXT NOT NULL,
      status TEXT NOT NULL,
      ipv4 TEXT,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      price_monthly TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_server_owner ON servers(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS domains (
      id TEXT PRIMARY KEY,
      domain TEXT UNIQUE NOT NULL,
      owner TEXT NOT NULL,
      resource_id INTEGER,
      status TEXT NOT NULL CHECK(status IN ('pending', 'active', 'failed', 'expired')),
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_domain_owner ON domains(owner);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS used_payments (
      nonce TEXT PRIMARY KEY,
      payer TEXT NOT NULL,
      amount TEXT NOT NULL,
      tx_hash TEXT,
      endpoint TEXT NOT NULL,
      verified_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payment_payer ON used_payments(payer);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS memory_index (
      agent TEXT NOT NULL,
      key TEXT NOT NULL,
      root_hash TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (agent, key)
    );
  `);

  console.log("Database initialized");
}

initDatabase();
