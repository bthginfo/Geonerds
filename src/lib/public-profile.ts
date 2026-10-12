import { BADGES, computeStats, type Stats } from "./badges";
import type { PublicProfile } from "./online";

type Row = Record<string, unknown>;
const count = (value: unknown) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number >= 0 ? number : 0;
};

/** All-history SQL aggregates keep profile responses bounded, even for prolific players. */
export function publicProfileFromAggregates(name: string, totals: Row, games: Row[], awards: Row[]): PublicProfile {
  const stats: Stats = {
    ...computeStats([]),
    accountAwardIds: awards.map((award) => String(award.badge_id)),
    totalRuns: count(totals.runs), totalScore: count(totals.total),
    maxScoreRun: count(totals.max_score), bestStreak: count(totals.streak),
    perfectRounds: count(totals.perfect), bigPerfect: count(totals.big_perfect),
    distinctGames: games.length, hardRuns: count(totals.hard_runs),
    hardPerfect: count(totals.hard_perfect), typeRuns: count(totals.type_runs),
    distinctDays: count(totals.days),
    // Local-hour play and per-country GeoDex hits are not persisted to the account.
    // Do not guess these badges from the server's timezone or the visiting browser.
    nightOwl: 0,
  };
  for (const game of games) {
    const id = String(game.game_id);
    stats.correctByGame[id] = count(game.correct);
    stats.bestStreakByGame[id] = count(game.streak);
    stats.maxTotalByGame[id] = count(game.max_total);
    stats.runsByGame[id] = count(game.runs);
    stats.perfectByGame[id] = count(game.perfect);
    stats.hardRunsByGame[id] = count(game.hard_runs);
    stats.hardPerfectByGame[id] = count(game.hard_perfect);
    stats.flawlessByGame[id] = count(game.flawless);
  }
  return {
    name, totalScore: stats.totalScore, totalRuns: stats.totalRuns, bestStreak: stats.bestStreak,
    games: games.map((game) => ({ game_id: String(game.game_id), best: count(game.best), runs: count(game.runs) })),
    badgeIds: BADGES.filter((badge) => badge.earned(stats)).map((badge) => badge.id),
  };
}
