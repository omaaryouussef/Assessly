import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

pg.types.setTypeParser(1082, (value) => value); // DATE — keep as string

const db = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT) || 5432,
  max: Number(process.env.DB_POOL_MAX) || 10,
  ssl:
    process.env.DB_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
});

/**
 * Run work on a single pooled connection so BEGIN/COMMIT stay on one session.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function withTransaction(fn) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // No active transaction to roll back.
    }
    throw error;
  } finally {
    client.release();
  }
}

/** Abort a transaction and return a specific HTTP status from the handler. */
export function txHttpError(status, message) {
  const error = new Error(message);
  error.statusCode = status;
  return error;
}

export default db;
