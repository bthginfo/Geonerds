import type postgres from "postgres";
import { CONTRIBUTOR_BADGE_ID, GAME_CREATOR_BADGE_ID } from "./community-rewards";

/** Reviewed release metadata, never supplied by a browser or inferred from local XP. */
const RELEASES = [{
  gameId: "adastra",
  authorName: "Adastra1995",
  proposalExcerpt: "photos taken at night by pilots or the iss showing cities and small towns",
}] as const;

/** Executed only against the configured app DB; local offline previews never contact production. */
export async function ensureCommunityRewards(sql: ReturnType<typeof postgres>, publishCommunityFeature = process.env.VERCEL_ENV === "production") {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(714003202)`;
    await tx`CREATE TABLE IF NOT EXISTS gn_badge_awards (
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      badge_id text NOT NULL,
      game_id text NOT NULL,
      feedback_id text REFERENCES gn_feedback(id) ON DELETE SET NULL,
      awarded_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id,badge_id)
    )`;
    await tx`CREATE TABLE IF NOT EXISTS gn_community_notifications (
      id text PRIMARY KEY,
      user_id text NOT NULL REFERENCES gn_users(id) ON DELETE CASCADE,
      kind text NOT NULL CHECK (kind IN ('game-published','feature-published')),
      game_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      read_at timestamptz,
      UNIQUE (user_id,kind,game_id)
    )`;
    await tx`CREATE INDEX IF NOT EXISTS gn_community_notifications_user_idx
      ON gn_community_notifications (user_id,created_at DESC)`;
    await tx`ALTER TABLE gn_community_notifications DROP CONSTRAINT IF EXISTS gn_community_notifications_kind_check`;
    await tx`ALTER TABLE gn_community_notifications ADD CONSTRAINT gn_community_notifications_kind_check
      CHECK (kind IN ('game-published','feature-published'))`;
    {
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
      if (publishCommunityFeature) {
      // Preview/local QA must not announce an unfinished feature to real users.
      // Verified in TheCreator's private community inbox, 12 October 2026.
      // Resolve the real submission/account ID, not a local name or browser-supplied identity.
      await tx`WITH community_contributor AS (
        SELECT f.id,f.user_id FROM gn_feedback f JOIN gn_users u ON u.id=f.user_id
        WHERE lower(f.author_name)='shahin' AND u.name_lower='shahin'
          AND f.created_at>=TIMESTAMPTZ '2026-10-11 00:00:00+00'
          AND strpos(lower(f.message),'hope to challenge other people not only my friends')>0
        ORDER BY f.created_at DESC,f.id ASC LIMIT 1
      ) INSERT INTO gn_badge_awards (user_id,badge_id,game_id,feedback_id)
        SELECT user_id,${CONTRIBUTOR_BADGE_ID},'challenges',id FROM community_contributor
        ON CONFLICT (user_id,badge_id) DO NOTHING`;
      await tx`INSERT INTO gn_community_notifications (id,user_id,kind,game_id)
        SELECT md5(user_id || ':community-challenges:published'),user_id,'feature-published','challenges'
        FROM gn_badge_awards WHERE badge_id=${CONTRIBUTOR_BADGE_ID} AND game_id='challenges'
        ON CONFLICT (user_id,kind,game_id) DO NOTHING`;
      }
    }
  });
}
