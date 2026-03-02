import { Pool } from 'pg';

let poolInstance: Pool | null = null;

export class DbClient {
  constructor(private pool: Pool) { }

  async execute(options: { sql: string; args?: any[] } | string): Promise<any> {
    const isString = typeof options === 'string';
    let rawSql = isString ? options : options.sql;
    const args = isString ? [] : (options.args || []);

    // Translate SQLite parameterized queries (?) into PostgreSQL parameterized queries ($1, $2)
    let argumentIndex = 1;
    rawSql = rawSql.replace(/\?/g, () => `$${argumentIndex++}`);

    try {
      const result = await this.pool.query(rawSql, args);
      return { rows: result.rows, rowsAffected: result.rowCount || 0 };
    } catch (error: any) {
      if (error.code !== '3D000') {
        console.error('Database query error:', error);
      }
      throw error;
    }
  }

  async executeMultiple(sql: string) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

let dbClient: DbClient;

export function getDatabase(): DbClient {
  if (!dbClient) {
    poolInstance = new Pool({
      // Default to a hard-coded local string so tests or quick-starts work natively
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aletheia',
    });

    dbClient = new DbClient(poolInstance);
  }
  return dbClient;
}

export async function initDb() {
  // Extract connection details to attempt auto-creating the DB if missing
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/aletheia';

  let db: DbClient;
  try {
    // Attempt normal connection
    db = getDatabase();
    // Test the connection
    await db.execute('SELECT 1');
  } catch (initialError: any) {
    // 3D000 is the PostgreSQL error code for "catalog/database does not exist"
    if (initialError.code === '3D000' || initialError.message.includes('does not exist')) {
      console.log('Database does not exist. Attempting to create it...');
      try {
        // Connect to the default 'postgres' database instead, parsing the URL to replace the ending dbname
        const baseUrl = connectionString.substring(0, connectionString.lastIndexOf('/'));
        const targetDbName = connectionString.substring(connectionString.lastIndexOf('/') + 1);

        const tempPool = new Pool({ connectionString: `${baseUrl}/postgres` });
        await tempPool.query(`CREATE DATABASE "${targetDbName}"`);
        await tempPool.end();
        console.log(`Successfully created database "${targetDbName}".`);

        // Reset the poolInstance to connect to the newly created DB
        poolInstance = null;
        dbClient = undefined as any;
        db = getDatabase();
      } catch (createError) {
        console.error('Failed to auto-create the database:', createError);
        throw createError;
      }
    } else {
      console.error('Failed to connect to the database:', initialError);
      throw initialError;
    }
  }

  try {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS operations (
        id TEXT PRIMARY KEY,
        board_id TEXT NOT NULL,
        data TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      );
    `);
  } catch (error) {
    console.error('Failed to initialize PostgreSQL tables', error);
  }
  return db;
}
