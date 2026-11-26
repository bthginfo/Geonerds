import type { Difficulty, GameId } from "@/lib/types";

/**
 * Shared helpers for the daily-format puzzles (Geo Groups, Letter Atlas,
 * Place Trails, Geo Brackets). A "daily" board is identical for every player
 * on the same UTC date and difficulty; "endless" deals a fresh board per run.
 */

export type PuzzleVariant = "daily" | "endless";

export const PUZZLE_VARIANTS: PuzzleVariant[] = ["daily", "endless"];

/** First day of the daily puzzle series; puzzle #1. */
export const PUZZLE_EPOCH = Date.UTC(2026, 10, 26);

export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** 1-based number of today's daily puzzle, used in share texts ("#12"). */
export function dailyPuzzleNumber(now: Date = new Date()): number {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.max(1, Math.floor((today - PUZZLE_EPOCH) / 86_400_000) + 1);
}

export function isDailyVariant(variant: string | undefined): boolean {
  return variant !== "endless";
}

/**
 * Seed for one puzzle run. Challenges pass their own seed; the daily variant
 * derives a public, date-based seed so everybody solves the same board.
 */
export function puzzleSeed(gameId: GameId, opts: { variant?: string; difficulty: Difficulty; seed?: string; challenge?: boolean; now?: Date }): string {
  if (opts.challenge && opts.seed) return opts.seed;
  if (isDailyVariant(opts.variant)) return `${gameId}:daily:v1:${utcDateKey(opts.now)}:${opts.difficulty}`;
  return opts.seed ?? `${gameId}:${Date.now()}:${Math.random()}`;
}

/** Milliseconds until the next UTC midnight, when a new daily board appears. */
export function msUntilNextDaily(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(0, next - now.getTime());
}

// ── Local daily record ────────────────────────────────────────────────

export interface DailyRecord {
  solved: boolean;
  score: number;
  /** Spoiler-free result line(s), e.g. an emoji grid. */
  share: string;
  at: number;
}

const STORAGE_KEY = "geonerds-daily-puzzles";

type DailyStore = Record<string, Record<string, DailyRecord>>;

function readStore(): DailyStore {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as DailyStore : {};
  } catch {
    return {};
  }
}

function dailyKey(gameId: GameId, difficulty: Difficulty, date: string) {
  return `${date}:${difficulty}`;
}

export function readDailyRecord(gameId: GameId, difficulty: Difficulty, now: Date = new Date()): DailyRecord | null {
  return readStore()[gameId]?.[dailyKey(gameId, difficulty, utcDateKey(now))] ?? null;
}

/** Keeps the first completion of the day; later replays never overwrite it. */
export function writeDailyRecord(gameId: GameId, difficulty: Difficulty, record: DailyRecord, now: Date = new Date()): void {
  try {
    const store = readStore();
    const key = dailyKey(gameId, difficulty, utcDateKey(now));
    const games = store[gameId] ?? {};
    if (games[key]) return;
    // Keep the store small: retain the latest 60 entries per game.
    const entries = Object.entries({ ...games, [key]: record }).sort(([a], [b]) => b.localeCompare(a)).slice(0, 60);
    store[gameId] = Object.fromEntries(entries);
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage can be unavailable (private mode); the run itself still counts.
  }
}

/** Consecutive UTC days (ending today or yesterday) with a solved daily board for this game. */
export function dailyStreak(gameId: GameId, now: Date = new Date()): number {
  const games = readStore()[gameId] ?? {};
  const solvedDates = new Set(Object.entries(games).filter(([, record]) => record.solved).map(([key]) => key.slice(0, 10)));
  const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (!solvedDates.has(utcDateKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  while (solvedDates.has(utcDateKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

/** Native share sheet when available, clipboard otherwise. Resolves to how it was shared. */
export async function shareText(text: string): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function" && window.matchMedia?.("(pointer: coarse)").matches) {
      await navigator.share({ text });
      return "shared";
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") return "failed";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
