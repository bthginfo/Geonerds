/**
 * Rare Finds scoring. Pure functions shared by the game and its tests.
 *
 * A valid answer scores round(100 × (1 − share)), where share is the fraction
 * of today's answers to that prompt that picked the same country (the
 * player's own answer included), and never less than 10. Until a prompt has
 * 20 answers, and whenever live data is unavailable (Endless, Practice,
 * challenges, offline), a dataset estimate based on the country's difficulty
 * tier is used instead: tier 1 → 40, 2 → 55, 3 → 70, 4 → 85.
 */

export const MAX_PROMPT_POINTS = 100;
export const MIN_VALID_POINTS = 10;
/** Live rarity only counts once a prompt has this many answers. */
export const EARLY_THRESHOLD = 20;

/** Where a prompt's points came from. */
export type RaritySource = "live" | "early" | "estimated" | "offline";

export interface AnswerCount {
  /** Answers for the player's country, their own included. */
  count: number;
  /** All answers to the prompt, the player's own included. */
  total: number;
}

/** Fraction (0–1) of answers that picked the player's country. */
export function rarityShare({ count, total }: AnswerCount): number {
  const safeTotal = Math.max(1, Math.floor(total));
  const safeCount = Math.min(safeTotal, Math.max(1, Math.floor(count)));
  return safeCount / safeTotal;
}

export function livePoints(answer: AnswerCount): number {
  return Math.max(MIN_VALID_POINTS, Math.round(MAX_PROMPT_POINTS * (1 - rarityShare(answer))));
}

/** Dataset estimate from a country's difficulty tier (1 well-known … 4 obscure). */
export function rarityFallback(tier: number): number {
  const clamped = Math.min(4, Math.max(1, Math.round(tier)));
  return 40 + 15 * (clamped - 1);
}

export interface ScoredAnswer {
  points: number;
  source: RaritySource;
  /** Live share (0–1) when server data exists, even if still early. */
  share: number | null;
}

/**
 * Scores one answer.
 * - `live: false` (Endless, Practice, challenges): always the estimate.
 * - `live: true` with no distribution: the server could not be reached.
 */
export function scoreAnswer(opts: { valid: boolean; tier: number; live: boolean; distribution?: AnswerCount | null }): ScoredAnswer {
  const { valid, tier, live, distribution } = opts;
  const share = live && distribution && distribution.total > 0 ? rarityShare(distribution) : null;
  if (!live) return { points: valid ? rarityFallback(tier) : 0, source: "estimated", share: null };
  if (!distribution) return { points: valid ? rarityFallback(tier) : 0, source: "offline", share: null };
  if (distribution.total < EARLY_THRESHOLD) return { points: valid ? rarityFallback(tier) : 0, source: "early", share };
  return { points: valid ? livePoints(distribution) : 0, source: "live", share };
}

/** Share-text marker per prompt. */
export function rarityEmoji(points: number, valid: boolean): string {
  if (!valid) return "❌";
  if (points >= 90) return "💎";
  if (points >= 70) return "🟣";
  if (points >= 40) return "🔵";
  return "⚪";
}

/** Longest run of consecutive valid answers. */
export function longestValidRun(valid: readonly boolean[]): number {
  let best = 0;
  let run = 0;
  for (const value of valid) {
    run = value ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/** Spoiler-free share text: no prompts, no countries. */
export function buildShareText(header: string, results: readonly { valid: boolean; points: number }[]): string {
  const total = results.reduce((sum, result) => sum + (result.valid ? result.points : 0), 0);
  const lines = results.map((result, index) => `${index + 1}. ${rarityEmoji(result.points, result.valid)} ${result.valid ? result.points : 0}`);
  return [header, ...lines, `${total}/${results.length * MAX_PROMPT_POINTS}`, "geo-nerds.com"].join("\n");
}
