import { Pool } from 'pg';

let pool: Pool;

// The shim for the execution layer to maintain compatibility with SQLite code.
export class DbClient {
  constructor(private pool: Pool) { }

  async execute(options: { sql: string; args?: any[] } | string): Promise<any> {
    const isString = typeof options === 'string';
    const rawSql = isString ? options : options.sql;
    const args = isString ? [] : (options.args || []);

    // Convert SQLite `?` to PostgreSQL `$1`, `$2`, etc.
    let pgSql = '';
    let paramIndex = 1;
    for (let i = 0; i < rawSql.length; i++) {
      if (rawSql[i] === '?') {
        pgSql += `$${paramIndex++}`;
      } else {
        pgSql += rawSql[i];
      }
    }

    const result = await this.pool.query(pgSql, args);
    return {
      rows: result.rows,
      rowsAffected: result.rowCount
    };
  }

  async executeMultiple(sql: string) {
    // For schema definitions
    await this.pool.query(sql);
  }
}

let dbClient: DbClient;

export function getDatabase(): DbClient {
  if (!dbClient) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aletheia'
    });
    dbClient = new DbClient(pool);
  }
  return dbClient;
}

async function initializeTables(db: DbClient) {
  // Translate SQLite specific SQL to PostgreSQL
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS "user" (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      emailVerified BOOLEAN NOT NULL,
      image TEXT,
      createdAt TIMESTAMP NOT NULL,
      updatedAt TIMESTAMP NOT NULL
    );

    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      user_id TEXT NOT NULL,
      company_type TEXT DEFAULT 'peruana' CHECK(company_type IN ('peruana', 'extranjera')),
      country TEXT,
      registration_code TEXT,
      ruc TEXT,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES "user"(id)
    );

    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      color TEXT NOT NULL DEFAULT '#4A90D9',
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      document_type TEXT DEFAULT '',
      priority TEXT DEFAULT 'media' CHECK(priority IN ('alta', 'media', 'baja')),
      position INTEGER NOT NULL DEFAULT 0,
      link TEXT,
      attachment_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      data JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );
  `);
}

export async function initDb() {
  const db = getDatabase();
  try {
    await initializeTables(db);
  } catch (error) {
    console.error('Failed to initialize PostgreSQL tables', error);
  }
  return db;
}

export { pool };
