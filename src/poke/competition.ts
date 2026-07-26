import type { PokeDifficulty, PokeGameId, PokePlayResult, PokeRun } from "./types";

export const POKE_ROUND_COUNTS = [5, 10, 20] as const;
export type PokeRoundCount = (typeof POKE_ROUND_COUNTS)[number];
export type LeagueTier = "bronze" | "silver" | "gold" | "platinum" | "master";
export type ChallengeStatus = "pending" | "active" | "resolved" | "declined" | "cancelled" | "expired";
export type ViewerChallengeOutcome = "win" | "loss" | "draw";

export interface RankedRunInput extends PokePlayResult {
  gameId: PokeGameId;
  difficulty: PokeDifficulty;
  generationCap: number;
  selectedRounds: PokeRoundCount;
}

/**
 * Cross-game Field Rating (0–1,200).
 *
 * Completion prevents short/abandoned runs from outranking complete missions.
 * Accuracy contributes 65% of the completed-run value. Difficulty is a small,
 * explicit multiplier; raw game score is deliberately excluded because the
 * twelve modules use different scoring scales.
 */
export function normalizedPokeRating(input: Pick<RankedRunInput, "correct" | "questions" | "completedRounds" | "selectedRounds" | "difficulty">): number {
  if (input.questions <= 0 || input.selectedRounds <= 0 || input.completedRounds <= 0) return 0;
  const accuracy = Math.min(1, Math.max(0, input.correct / input.questions));
  const completion = Math.min(1, Math.max(0, input.completedRounds / input.selectedRounds));
  const difficulty = input.difficulty === "hard" ? 1.1 : input.difficulty === "easy" ? 0.9 : 1;
  return Math.min(1200, Math.round(1000 * completion * (0.35 + accuracy * 0.65) * difficulty));
}

export function accuracyOf(run: Pick<PokePlayResult, "correct" | "questions">): number {
  return run.questions > 0 ? Math.min(1, Math.max(0, run.correct / run.questions)) : 0;
}

export function compareRankedRuns(a: Pick<RankedRunInput, "score" | "correct" | "questions" | "durationMs" | "completedRounds" | "selectedRounds" | "difficulty">, b: Pick<RankedRunInput, "score" | "correct" | "questions" | "durationMs" | "completedRounds" | "selectedRounds" | "difficulty">): number {
  const rating = normalizedPokeRating(b) - normalizedPokeRating(a);
  if (rating) return rating;
  if (b.correct !== a.correct) return b.correct - a.correct;
  const accuracy = accuracyOf(b) - accuracyOf(a);
  if (accuracy) return accuracy;
  if (a.durationMs !== b.durationMs) return a.durationMs - b.durationMs;
  return b.score - a.score;
}

export function leagueTier(rating: number): LeagueTier {
  if (rating >= 1800) return "master";
  if (rating >= 1500) return "platinum";
  if (rating >= 1250) return "gold";
  if (rating >= 1050) return "silver";
  return "bronze";
}

export function eloPair(ratingA: number, ratingB: number, outcomeA: 0 | 0.5 | 1, placementsA = 5, placementsB = 5) {
  const expectedA = 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
  const k = placementsA < 5 || placementsB < 5 ? 48 : 32;
  const delta = Math.round(k * (outcomeA - expectedA));
  return { a: Math.max(100, ratingA + delta), b: Math.max(100, ratingB - delta), delta };
}

export function canTransitionChallenge(from: ChallengeStatus, action: "accept" | "decline" | "cancel", expired = false): ChallengeStatus | null {
  if (expired) return null;
  if (from === "pending" && action === "accept") return "active";
  if (from === "pending" && action === "decline") return "declined";
  if (from === "pending" && action === "cancel") return "cancelled";
  return null;
}

export function viewerChallengeOutcome(status: ChallengeStatus, winnerId: string | null, viewerId: string): ViewerChallengeOutcome | null {
  if (status !== "resolved") return null;
  if (!winnerId) return "draw";
  return winnerId === viewerId ? "win" : "loss";
}

export function challengePlayBlockReason(challenge: {status: ChallengeStatus; seed: string | null; viewerAttempted?: boolean}): string | null {
  if (challenge.status !== "active") return `challenge_${challenge.status}`;
  if (!challenge.seed) return "challenge_seed_unavailable";
  if (challenge.viewerAttempted) return "challenge_attempt_already_submitted";
  return null;
}

export function qualifiesAtlasClearance(input: Pick<RankedRunInput, "gameId" | "generationCap" | "completedRounds" | "selectedRounds">): boolean {
  return (
    ["poke-path-expedition", "region-ranger", "habitat-hunt"].includes(input.gameId) &&
    input.generationCap === 9 &&
    input.completedRounds === input.selectedRounds
  );
}

export function isPlausibleRankedRun(input: RankedRunInput): boolean {
  return (
    Number.isInteger(input.score) &&
    input.score >= 0 &&
    input.score <= 10_000_000 &&
    Number.isInteger(input.correct) &&
    Number.isInteger(input.questions) &&
    input.questions > 0 &&
    input.questions <= 500 &&
    input.correct >= 0 &&
    input.correct <= input.questions &&
    POKE_ROUND_COUNTS.includes(input.selectedRounds) &&
    Number.isInteger(input.completedRounds) &&
    input.completedRounds >= 0 &&
    input.completedRounds <= input.selectedRounds &&
    Number.isInteger(input.generationCap) &&
    input.generationCap >= 1 &&
    input.generationCap <= 9 &&
    Number.isInteger(input.durationMs) &&
    input.durationMs >= 1_000 &&
    input.durationMs <= 6 * 60 * 60 * 1000
  );
}

export function migrateLocalRun(run: Partial<PokeRun> & Pick<PokeRun, "id" | "gameId" | "score" | "correct" | "total" | "selectedRounds" | "difficulty" | "practice" | "speciesIds" | "createdAt">): PokeRun {
  const total = Math.max(run.correct, run.total, 0);
  const completedRounds = Math.min(run.selectedRounds, Math.max(0, run.completedRounds ?? Math.min(run.total, run.selectedRounds)));
  const migrated: PokeRun = {
    ...run,
    total,
    completedRounds,
    generationCap: run.generationCap ?? 1,
    durationMs: run.durationMs ?? 0,
    normalizedRating: normalizedPokeRating({
      correct: Math.min(run.correct, total),
      questions: total,
      completedRounds,
      selectedRounds: run.selectedRounds,
      difficulty: run.difficulty,
    }),
    correct: Math.min(run.correct, total),
    verified: false,
    legacy: run.durationMs == null || run.generationCap == null,
  };
  return migrated;
}
