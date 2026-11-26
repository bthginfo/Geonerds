import { getCountryByCca3 } from "@/data/countries";
import { puzzleSeed, utcDateKey } from "@/games/puzzle-kit";
import { PROMPTS_PER_BOARD, generateRareBoard, getRarePrompt, isAcceptedAnswer, type RareBoard } from "./generator";

/**
 * Pure helpers behind /api/rare-finds. The route re-derives the daily board
 * from the same generator the client uses and only counts answers that truly
 * fit the prompt, so the aggregate cannot be filled with arbitrary strings.
 */

export const RARE_GAME_ID = "rare-finds" as const;

/** The daily board ignores difficulty; it always uses the "medium" seed. */
export const RARE_DIFFICULTY = "medium" as const;

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && utcDateKey(date) === value;
}

/** Seed of the daily board for a UTC day key (YYYY-MM-DD). */
export function dailySeedForDay(day: string): string {
  return puzzleSeed(RARE_GAME_ID, { variant: "daily", difficulty: RARE_DIFFICULTY, now: new Date(`${day}T12:00:00Z`) });
}

export function dailyBoardForDay(day: string): RareBoard {
  return generateRareBoard(dailySeedForDay(day));
}

/** Today and yesterday (UTC): a run that starts before midnight may finish after it. */
export function acceptedDays(now: Date = new Date()): string[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return [utcDateKey(new Date(today)), utcDateKey(new Date(today - 86_400_000))];
}

export interface RareSubmission {
  day: string;
  promptIndex: number;
  promptId: string;
  answer: string;
}

export type RareError = "bad_request" | "invalid_day" | "unknown_prompt" | "invalid_answer";

export type Validated<T> = { ok: true; value: T } | { ok: false; error: RareError };

function validDayAndPrompt(day: unknown, promptIndex: unknown, now: Date): Validated<{ day: string; promptIndex: number; promptId: string }> {
  if (!isDayKey(day)) return { ok: false, error: "bad_request" };
  if (typeof promptIndex !== "number" || !Number.isInteger(promptIndex)) return { ok: false, error: "bad_request" };
  if (!acceptedDays(now).includes(day)) return { ok: false, error: "invalid_day" };
  if (promptIndex < 0 || promptIndex >= PROMPTS_PER_BOARD) return { ok: false, error: "unknown_prompt" };
  const promptId = dailyBoardForDay(day).promptIds[promptIndex];
  if (!promptId) return { ok: false, error: "unknown_prompt" };
  return { ok: true, value: { day, promptIndex, promptId } };
}

/** Validates a POST body: the answer must be a known cca3 that fits that day's prompt. */
export function validateRareSubmission(input: unknown, now: Date = new Date()): Validated<RareSubmission> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, error: "bad_request" };
  const body = input as Record<string, unknown>;
  if (typeof body.promptId !== "string" || typeof body.answer !== "string") return { ok: false, error: "bad_request" };
  const base = validDayAndPrompt(body.day, body.promptIndex, now);
  if (!base.ok) return base;
  if (body.promptId !== base.value.promptId) return { ok: false, error: "unknown_prompt" };
  const prompt = getRarePrompt(base.value.promptId);
  if (!prompt) return { ok: false, error: "unknown_prompt" };
  const answer = body.answer;
  if (!/^[A-Z]{3}$/.test(answer) || !getCountryByCca3(answer) || !isAcceptedAnswer(prompt, answer)) return { ok: false, error: "invalid_answer" };
  return { ok: true, value: { ...base.value, answer } };
}

/** Validates the GET query used to show today's top answers after a miss. */
export function validateRareQuery(day: string | null, prompt: string | null, now: Date = new Date()): Validated<{ day: string; promptIndex: number; promptId: string }> {
  if (prompt === null || !/^\d$/.test(prompt)) return { ok: false, error: "bad_request" };
  return validDayAndPrompt(day, Number(prompt), now);
}

export interface RareDistribution {
  /** Whether this request added the answer to the counter. */
  counted: boolean;
  /** All answers to the prompt (the player's own included when an answer is given). */
  total: number;
  /** Answers for the player's country (0 without an answer). */
  count: number;
  /** Most common answers, at most five. */
  top: { answer: string; count: number }[];
}

export const TOP_ANSWERS = 5;

/**
 * Builds the response from the stored rows. A repeated (uncounted) answer
 * that is not stored yet is still included once, so the player's own pick
 * is always part of the share.
 */
export function summarizeDistribution(rows: readonly { answer: string; count: number }[], answer: string | null, counted: boolean): RareDistribution {
  const clean = rows
    .map((row) => ({ answer: String(row.answer), count: Math.max(0, Math.floor(Number(row.count) || 0)) }))
    .filter((row) => row.count > 0);
  let total = clean.reduce((sum, row) => sum + row.count, 0);
  let count = answer ? clean.find((row) => row.answer === answer)?.count ?? 0 : 0;
  if (answer && count === 0) {
    count = 1;
    total += 1;
    clean.push({ answer, count: 1 });
  }
  const top = clean.sort((a, b) => b.count - a.count || a.answer.localeCompare(b.answer)).slice(0, TOP_ANSWERS);
  return { counted, total, count, top };
}
