import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { newDb } from 'pg-mem';
import { config } from '../config.js';
import { logger } from '../logger.js';

export interface QueryResult<T extends QueryResultRow = QueryResultRow> {
  rows: T[];
  rowCount: number;
}

export interface Database {
  kind: 'postgres' | 'pg-mem';
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
  withTransaction<T>(fn: (tx: DatabaseTx) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DatabaseTx {
  query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

function schemaPath(): string {
  return fileURLToPath(new URL('./schema.sql', import.meta.url));
}

async function migrate(db: Database): Promise<void> {
  const sql = fs.readFileSync(schemaPath(), 'utf8');
  // Executing statements individually makes failures explicit and keeps the
  // migration usable with the pg-mem compatibility adapter used by tests.
  const statements = sql
    .split(/;\s*\n/)
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0 && !statement.startsWith('--'));

  for (const statement of statements) {
    try {
      await db.query(statement);
    } catch (error) {
      // pg-mem does not implement CREATE INDEX; indexes are a PostgreSQL
      // performance optimisation and not required for correctness.
      if (db.kind === 'pg-mem' && /^CREATE INDEX/i.test(statement)) continue;
      throw error;
    }
  }
  for (const version of [1, 2]) {
    await db.query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, $2)', [
      version,
      new Date().toISOString(),
    ]).catch(() => undefined);
  }
}

function wrapPool(pool: Pool, kind: 'postgres' | 'pg-mem' = 'postgres'): Database {
  return {
    kind,
    async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: unknown[] = []) {
      const started = Date.now();
      const result = await pool.query<T>(sql, params);
      const duration = Date.now() - started;
      if (duration > 500) logger.warn('slow_query', { duration, sql: sql.slice(0, 160) });
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
    async withTransaction<T>(fn: (tx: DatabaseTx) => Promise<T>): Promise<T> {
      const client: PoolClient = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx: DatabaseTx = {
          async query(sql, params = []) {
            const result = await client.query(sql, params as unknown[]);
            return { rows: result.rows, rowCount: result.rowCount ?? 0 };
          },
        };
        const value = await fn(tx);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

export async function createDatabase(): Promise<Database> {
  if (config.databaseUrl) {
    const pool = new Pool({
      connectionString: config.databaseUrl,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    const db = wrapPool(pool);
    await migrate(db);
    logger.info('database_ready', { kind: 'postgres' });
    return db;
  }

  if (!config.allowDemoDb) {
    throw new Error('PostgreSQL is required. Set DATABASE_URL.');
  }

  const memory = newDb({ autoCreateForeignKeyIndices: true });
  const adapter = memory.adapters.createPg();
  const pool = new adapter.Pool();
  const db = wrapPool(pool as unknown as Pool);
  db.kind = 'pg-mem';
  await migrate(db);
  logger.warn('database_ready', {
    kind: 'pg-mem',
    message: 'DEMO MODE: in-memory database. Data resets when the API restarts. Configure DATABASE_URL for durable storage.',
  });
  return db;
}

export const __test = { migrate, schemaPath };
