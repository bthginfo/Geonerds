import type postgres from "postgres";
import { GAME_CREATOR_BADGE_ID } from "./community-rewards";

/** Reviewed release metadata, never supplied by a browser or inferred from local XP. */
const RELEASES = [{
  gameId: "adastra",
  authorName: "Adastra1995",
  proposalExcerpt: "photos taken at night by pilots or the iss showing cities and small towns",
}] as const;

/** Executed only against the configured app DB; local offline previews never contact production. */
export async function ensureCommunityRewards(sql: ReturnType<typeof postgres>) {
  await sql`CREATE TABLE IF NOT EXISTS gn_badge_awards (
    user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
    badge_id text NOT NULL,
    game_id text NOT NULL,
    feedback_id text REFERENCES gn_feedback(id) ON DELETE SET NULL,
    awarded_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id,badge_id)
  )`;
  await sql`CREATE TABLE IF NOT EXISTS gn_community_notifications (
    id text PRIMARY KEY,
    user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind='game-published'),
    game_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz,
    UNIQUE (user_id,kind,game_id)
  )`;
  await sql`CREATE INDEX IF NOT EXISTS gn_community_notifications_user_idx
    ON gn_community_notifications (user_id,created_at DESC)`;
  await sql.begin(async (tx) => {
    for (const release of RELEASES) {
      // Resolve the actual submission's account ID. A similarly named local guest cannot earn it.
      await tx`WITH contributor AS (
        SELECT f.id,f.user_id FROM gn_feedback f JOIN gn_users u ON u.id=f.user_id
        WHERE lower(f.author_name)=${release.authorName.toLowerCase()}
          AND u.name_lower=${release.authorName.toLowerCase()}
          AND strpos(lower(f.message),${release.proposalExcerpt})>0
        ORDER BY f.created_at ASC,f.id ASC LIMIT 1
      ) INSERT INTO gn_badge_awards (user_id,badge_id,game_id,feedback_id)
        SELECT user_id,${GAME_CREATOR_BADGE_ID},${release.gameId},id FROM contributor
        ON CONFLICT (user_id,badge_id) DO NOTHING`;
      await tx`WITH contributor AS (
        SELECT f.user_id FROM gn_feedback f JOIN gn_users u ON u.id=f.user_id
        WHERE lower(f.author_name)=${release.authorName.toLowerCase()}
          AND u.name_lower=${release.authorName.toLowerCase()}
          AND strpos(lower(f.message),${release.proposalExcerpt})>0
        ORDER BY f.created_at ASC,f.id ASC LIMIT 1
      ) INSERT INTO gn_community_notifications (id,user_id,kind,game_id)
        SELECT md5(user_id || ':' || ${release.gameId} || ':published'),user_id,'game-published',${release.gameId}
        FROM contributor ON CONFLICT (user_id,kind,game_id) DO NOTHING`;
    }
  });
}
