/* ============================================================
   Postgres (Neon) — pool, migrazioni, helper transazioni.
   ============================================================ */
import pg from 'pg';
import { ENV } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: ENV.requireDb(),
  ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  max: 10,
});

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params as never);
}

/** Esegue `fn` dentro una transazione (con un client dedicato). */
export async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/** Crea le tabelle se non esistono (idempotente). */
export async function migrate(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      nick text NOT NULL,
      username text,
      email text,
      pass_hash text,
      is_guest boolean NOT NULL DEFAULT false,
      push_subscription jsonb,
      notifications_enabled boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  // ── Migrazioni idempotenti (login via username; email non più univoca) ──
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS username text;`);
  // l'email NON deve più essere univoca: più utenti possono condividere la stessa mail
  await query(`ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;`);
  // username univoco e case-insensitive, solo per utenti registrati (gli ospiti hanno username NULL)
  await query(
    `CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_idx
       ON users (lower(username)) WHERE username IS NOT NULL;`,
  );
  await query(`
    CREATE TABLE IF NOT EXISTS rooms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      code char(4) UNIQUE NOT NULL,
      host_id uuid NOT NULL REFERENCES users(id),
      guest_id uuid REFERENCES users(id),
      status text NOT NULL DEFAULT 'waiting',
      game_mode text NOT NULL,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await query(`CREATE INDEX IF NOT EXISTS rooms_code_idx ON rooms(code);`);
  await query(`
    CREATE TABLE IF NOT EXISTS games (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      room_id uuid UNIQUE NOT NULL REFERENCES rooms(id),
      state jsonb NOT NULL,
      rev integer NOT NULL,
      status text NOT NULL DEFAULT 'playing',
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);
}
