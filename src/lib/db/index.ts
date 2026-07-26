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
    CREATE TABLE IF NOT EXISTS wn_scores (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      name text NOT NULL,
      game_id text NOT NULL,
      difficulty text,
      score integer NOT NULL,
      correct integer,
      total integer,
      duration_ms integer,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS wn_scores_user_game_idx ON wn_scores (user_id, game_id, score DESC)`;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_profiles (
      user_id text PRIMARY KEY REFERENCES gn_users(id) ON DELETE CASCADE,
      avatar_species_id integer NOT NULL DEFAULT 25 CHECK (avatar_species_id BETWEEN 1 AND 1025),
      favorite_type text NOT NULL DEFAULT 'normal',
      bio text NOT NULL DEFAULT '',
      featured_badge_ids text[] NOT NULL DEFAULT '{}',
      visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_seasons (
      id text PRIMARY KEY,
      title text NOT NULL,
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      CHECK (ends_at > starts_at)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_ratings (
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      season_id text NOT NULL REFERENCES pn_seasons(id) ON DELETE CASCADE,
      rating integer NOT NULL DEFAULT 1000 CHECK (rating >= 100),
      wins integer NOT NULL DEFAULT 0,
      losses integer NOT NULL DEFAULT 0,
      draws integer NOT NULL DEFAULT 0,
      placements integer NOT NULL DEFAULT 0 CHECK (placements BETWEEN 0 AND 5),
      current_streak integer NOT NULL DEFAULT 0,
      best_streak integer NOT NULL DEFAULT 0,
      matches integer NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, season_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_challenges (
      id text PRIMARY KEY,
      challenger_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      opponent_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      season_id text NOT NULL REFERENCES pn_seasons(id) ON DELETE CASCADE,
      game_id text NOT NULL,
      difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      generation_cap integer NOT NULL CHECK (generation_cap BETWEEN 1 AND 9),
      rounds integer NOT NULL CHECK (rounds IN (5, 10, 20)),
      seed text NOT NULL UNIQUE,
      status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'resolved', 'declined', 'cancelled', 'expired')),
      winner_id text REFERENCES gn_users(id) ON DELETE SET NULL,
      expires_at timestamptz NOT NULL,
      accepted_at timestamptz,
      resolved_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (challenger_id <> opponent_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_scores (
      id text PRIMARY KEY,
      client_run_id text NOT NULL,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      season_id text NOT NULL REFERENCES pn_seasons(id) ON DELETE CASCADE,
      game_id text NOT NULL,
      difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
      generation_cap integer NOT NULL CHECK (generation_cap BETWEEN 1 AND 9),
      selected_rounds integer NOT NULL CHECK (selected_rounds IN (5, 10, 20)),
      completed_rounds integer NOT NULL,
      raw_score integer NOT NULL,
      normalized_rating integer NOT NULL,
      correct integer NOT NULL,
      total integer NOT NULL,
      duration_ms integer NOT NULL,
      challenge_id text REFERENCES pn_challenges(id) ON DELETE SET NULL,
      verified boolean NOT NULL DEFAULT false,
      ranked boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (user_id, client_run_id),
      CHECK (correct >= 0 AND total > 0 AND correct <= total),
      CHECK (completed_rounds >= 0 AND completed_rounds <= selected_rounds),
      CHECK (raw_score >= 0 AND duration_ms >= 1000)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_challenge_attempts (
      id text PRIMARY KEY,
      challenge_id text NOT NULL REFERENCES pn_challenges(id) ON DELETE CASCADE,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      score_id text NOT NULL UNIQUE REFERENCES pn_scores(id) ON DELETE CASCADE,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (challenge_id, user_id)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS pn_badge_awards (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      badge_id text NOT NULL,
      season_id text REFERENCES pn_seasons(id) ON DELETE CASCADE,
      earned_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS pn_badge_awards_once_idx ON pn_badge_awards (user_id, badge_id, COALESCE(season_id, 'permanent'))`;
  await sql`CREATE INDEX IF NOT EXISTS pn_scores_board_idx ON pn_scores (season_id, game_id, normalized_rating DESC, correct DESC, duration_ms ASC)`;
  await sql`CREATE INDEX IF NOT EXISTS pn_scores_user_best_idx ON pn_scores (user_id, game_id, normalized_rating DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS pn_challenges_inbox_idx ON pn_challenges (opponent_id, status, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS pn_challenges_sent_idx ON pn_challenges (challenger_id, status, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS pn_ratings_league_idx ON pn_ratings (season_id, rating DESC)`;
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
