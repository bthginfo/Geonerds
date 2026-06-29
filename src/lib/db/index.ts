import postgres from "postgres";

const CONNECTION =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

export const isDbConfigured = CONNECTION.length > 0;

let sqlClient: ReturnType<typeof postgres> | null = null;
let schemaReady: Promise<void> | null = null;

function client() {
  if (!isDbConfigured) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!sqlClient) {
    sqlClient = postgres(CONNECTION, {
      // Managed Postgres (Neon/Vercel) needs TLS; set DATABASE_SSL=disable for local dev.
      ssl: process.env.DATABASE_SSL === "disable" ? false : "require",
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlClient;
}

async function ensureSchema(sql: ReturnType<typeof postgres>) {
  await sql`
    CREATE TABLE IF NOT EXISTS gn_users (
      id text PRIMARY KEY,
      name text NOT NULL,
      name_lower text NOT NULL UNIQUE,
      passcode_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS gn_scores (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      name text NOT NULL,
      game_id text NOT NULL,
      difficulty text,
      mode text,
      score integer NOT NULL,
      correct integer,
      total integer,
      best_streak integer,
      duration_ms integer,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS gn_scores_game_score_idx ON gn_scores (game_id, score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS gn_scores_score_idx ON gn_scores (score DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS gn_rate_limit (
      bucket text PRIMARY KEY,
      count integer NOT NULL,
      reset_at timestamptz NOT NULL
    )
  `;
}

/** Returns the SQL client, lazily creating the schema once. */
export async function getDb() {
  const sql = client();
  if (!schemaReady) schemaReady = ensureSchema(sql);
  await schemaReady;
  return sql;
}
