import { getGame } from "@/games/registry";
import type { AnswerMode, Difficulty, RunResult } from "@/lib/types";
import { validateName } from "@/lib/validate";

export const CHALLENGE_GAME_IDS = [
  "flags", "capitals", "outline", "trivia", "waters", "neighbors", "origin", "mountains", "languages",
  "flag-pie", "city-compass", "flag-mosaic", "country-radar", "adastra",
] as const;
export const CHALLENGE_ROUND_COUNTS = [10, 25, 50] as const;
export const CHALLENGE_INVITE_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const CHALLENGE_PLAY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export type GeoChallengeInviteType = "direct" | "random" | "open" | "link";
export type GeoChallengeGameId = (typeof CHALLENGE_GAME_IDS)[number];
export type GeoChallengeStatus = "pending" | "active" | "resolved" | "declined" | "cancelled" | "expired";
export type GeoChallengeAction = "accept" | "decline" | "cancel";
export type GeoChallengeOutcome = "win" | "loss" | "draw";

export interface GeoChallengeConfig {
  gameId: GeoChallengeGameId;
  difficulty: Difficulty;
  mode: AnswerMode;
  rounds: number;
  timed: boolean;
  variant: string;
}

export interface CreateGeoChallengeInput extends GeoChallengeConfig {
  opponentName?: string;
  invitationType?: GeoChallengeInviteType;
}

export interface GeoChallengeAttempt {
  name: string;
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  mine: boolean;
  guest?: boolean;
}

export interface GeoChallenge extends GeoChallengeConfig {
  id: string;
  status: GeoChallengeStatus;
  seed: string | null;
  challengerName: string;
  /** The other player, relative to the signed-in viewer. */
  opponentName: string;
  direction: "sent" | "received" | "open";
  viewerAttempted: boolean;
  viewerStarted: boolean;
  attemptCount: number;
  expiresAt: string;
  createdAt: string;
  winnerName: string | null;
  viewerOutcome: GeoChallengeOutcome | null;
  attempts?: GeoChallengeAttempt[];
  invitationType?: GeoChallengeInviteType;
  viewerRole?: "challenger" | "opponent" | "visitor";
  viewerIsGuest?: boolean;
  opponentIsGuest?: boolean;
  canAccept?: boolean;
  sharePath?: string;
  /** Non-secret cache key; guest authority comes only from its challenge-bound cookie. */
  viewerKey?: string;
}

export type GeoChallengeNotificationKind = "invited" | "accepted" | "declined" | "cancelled" | "expired" | "opponent-finished" | "resolved";
export interface GeoChallengeNotification {
  id: string;
  challengeId: string;
  kind: GeoChallengeNotificationKind;
  actorName: string;
  gameId: GeoChallengeGameId;
  createdAt: string;
  readAt: string | null;
}

export type GeoChallengeRunInput = RunResult & { attemptToken: string };

/** Use the registry as the single source of truth for legal game settings. */
export function parseGeoChallengeConfig(body: Record<string, unknown>): CreateGeoChallengeInput | null {
  const opponentName = validateName(body.opponentName);
  const invitationType = body.invitationType ?? "direct";
  const gameId = body.gameId;
  if (!["direct", "random", "open", "link"].includes(String(invitationType))) return null;
  if ((invitationType === "direct" && !opponentName) || typeof gameId !== "string" || !CHALLENGE_GAME_IDS.some((id) => id === gameId)) return null;
  const game = getGame(gameId);
  if (!game) return null;
  const difficulty = body.difficulty;
  const mode = body.mode;
  const rounds = body.rounds;
  const timed = body.timed ?? false;
  const variant = body.variant ?? game.variants?.default ?? "";
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") return null;
  if (mode !== "choice" && mode !== "type") return null;
  if (!(game.modes ?? ["choice"]).includes(mode)) return null;
  if (typeof rounds !== "number" || !CHALLENGE_ROUND_COUNTS.some((count) => count === rounds)) return null;
  if (typeof timed !== "boolean" || (timed && !game.supportsTimed)) return null;
  if (typeof variant !== "string" || (game.variants ? !game.variants.options.includes(variant) : variant !== "")) return null;
  return { ...(opponentName ? { opponentName } : {}), invitationType: invitationType as GeoChallengeInviteType,
    gameId: gameId as GeoChallengeGameId, difficulty, mode, rounds, timed, variant };
}

export function geoChallengeTransition(
  status: GeoChallengeStatus, action: GeoChallengeAction, role: "challenger" | "opponent", expired = false,
): GeoChallengeStatus | null {
  if (expired || status !== "pending") return null;
  if (action === "cancel") return role === "challenger" ? "cancelled" : null;
  if (role !== "opponent") return null;
  return action === "accept" ? "active" : action === "decline" ? "declined" : null;
}

/** Positive means a wins. Never compare results from different configurations. */
export function compareGeoAttempts(a: Pick<GeoChallengeAttempt, "score" | "correct" | "durationMs">, b: Pick<GeoChallengeAttempt, "score" | "correct" | "durationMs">): number {
  return a.score - b.score || a.correct - b.correct || b.durationMs - a.durationMs;
}

export function validGeoChallengeResult(body: Record<string, unknown>, config: GeoChallengeConfig): boolean {
  if (body.gameId !== config.gameId || body.difficulty !== config.difficulty || body.mode !== config.mode) return false;
  const values = [body.score, body.correct, body.total, body.bestStreak, body.durationMs];
  if (!values.every((value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0)) return false;
  const { score, correct, total, bestStreak, durationMs } = body as unknown as RunResult;
  return total > 0 && total <= config.rounds && correct <= total && bestStreak <= correct
    && score <= correct * 1000 && durationMs >= 500 && durationMs <= 86_400_000;
}
