import type postgres from "postgres";

/** Additive upgrade: original account attempts and historical duel seeds stay intact. */
export async function ensureGeoChallengeCommunity(sql: ReturnType<typeof postgres>) {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(714003201)`;
    // Upgrade the old check once, atomically, without rewriting existing duels.
    await tx`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint
        WHERE conrelid='gn_challenges'::regclass AND conname='gn_challenges_rounds_all_check') THEN
        ALTER TABLE gn_challenges DROP CONSTRAINT IF EXISTS gn_challenges_rounds_check;
        ALTER TABLE gn_challenges ADD CONSTRAINT gn_challenges_rounds_all_check
          CHECK (rounds IN (0,10,25,50));
      END IF;
    END; $$`;
    await tx`ALTER TABLE gn_challenges ALTER COLUMN opponent_id DROP NOT NULL`;
    await tx`ALTER TABLE gn_challenges ADD COLUMN IF NOT EXISTS invitation_type text NOT NULL DEFAULT 'direct'
      CHECK (invitation_type IN ('direct','random','open','link'))`;
    await tx`ALTER TABLE gn_challenges ADD COLUMN IF NOT EXISTS guest_name text`;
    await tx`ALTER TABLE gn_challenges ADD COLUMN IF NOT EXISTS guest_token_hash text`;
    await tx`ALTER TABLE gn_challenges ADD COLUMN IF NOT EXISTS winner_side text
      CHECK (winner_side IN ('challenger','opponent'))`;
    await tx`CREATE TABLE IF NOT EXISTS gn_challenge_guest_starts (
      challenge_id text PRIMARY KEY REFERENCES gn_challenges(id) ON DELETE CASCADE,
      token text NOT NULL,
      started_at timestamptz NOT NULL DEFAULT now()
    )`;
    await tx`CREATE TABLE IF NOT EXISTS gn_challenge_guest_attempts (
      challenge_id text PRIMARY KEY REFERENCES gn_challenges(id) ON DELETE CASCADE,
      score integer NOT NULL CHECK (score >= 0),
      correct integer NOT NULL CHECK (correct >= 0),
      total integer NOT NULL CHECK (total > 0 AND correct <= total),
      best_streak integer NOT NULL CHECK (best_streak >= 0 AND best_streak <= correct),
      duration_ms integer NOT NULL CHECK (duration_ms >= 500),
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await tx`CREATE TABLE IF NOT EXISTS gn_challenge_notifications (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      challenge_id text NOT NULL REFERENCES gn_challenges(id) ON DELETE CASCADE,
      kind text NOT NULL CHECK (kind IN ('invited','accepted','declined','cancelled','expired','opponent-finished','resolved')),
      actor_name text NOT NULL DEFAULT '',
      game_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz,
      UNIQUE (user_id,challenge_id,kind)
    )`;
    await tx`CREATE INDEX IF NOT EXISTS gn_challenge_notifications_unread_idx
      ON gn_challenge_notifications (user_id,created_at DESC) WHERE read_at IS NULL`;
    await tx`CREATE INDEX IF NOT EXISTS gn_challenges_open_idx
      ON gn_challenges (created_at DESC) WHERE status='pending' AND invitation_type='open'`;
    // Apply the shorter invitation window to existing pending invites, never active matches.
    await tx`UPDATE gn_challenges SET expires_at=LEAST(expires_at,created_at+interval '3 days')
      WHERE status='pending' AND expires_at>created_at+interval '3 days'`;
  });
}
