import type { GameId, RunResult } from "./types";

export const PROGRESSION_VERSION = 1;

export interface GameProgress {
  runs: number;
  score: number;
  correct: number;
  total: number;
  perfectRuns: number;
  hardRuns: number;
  hardPerfectRuns: number;
  flawlessRuns: number;
}

export interface DayProgress {
  runs: number;
  correct: number;
  total: number;
  games: string[];
}

export interface ProgressionData {
  version: number;
  totalRuns: number;
  totalScore: number;
  totalCorrect: number;
  totalQuestions: number;
  maxScoreRun: number;
  bestStreak: number;
  games: Record<string, GameProgress>;
  days: Record<string, DayProgress>;
  stamps: string[];
  importedLegacyScores: boolean;
}

export function emptyProgression(): ProgressionData {
  return {
    version: PROGRESSION_VERSION,
    totalRuns: 0,
    totalScore: 0,
    totalCorrect: 0,
    totalQuestions: 0,
    maxScoreRun: 0,
    bestStreak: 0,
    games: {},
    days: {},
    stamps: [],
    importedLegacyScores: false,
  };
}

function finite(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function migrateProgression(value: unknown): ProgressionData {
  const base = emptyProgression();
  if (!value || typeof value !== "object") return base;
  const old = value as Partial<ProgressionData>;
  return {
    ...base,
    ...old,
    version: PROGRESSION_VERSION,
    totalRuns: finite(old.totalRuns),
    totalScore: finite(old.totalScore),
    totalCorrect: finite(old.totalCorrect),
    totalQuestions: finite(old.totalQuestions),
    maxScoreRun: finite(old.maxScoreRun),
    bestStreak: finite(old.bestStreak),
    games: old.games && typeof old.games === "object" ? old.games : {},
    days: old.days && typeof old.days === "object" ? old.days : {},
    stamps: Array.isArray(old.stamps) ? [...new Set(old.stamps.filter((x): x is string => typeof x === "string"))] : [],
    importedLegacyScores: Boolean(old.importedLegacyScores),
  };
}

export function localDayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function applyRun(data: ProgressionData, run: RunResult): ProgressionData {
  const next = migrateProgression(data);
  const correct = finite(run.correct);
  const total = finite(run.total);
  const score = finite(run.score);
  const gameId = run.gameId;
  const dayKey = localDayKey(run.createdAt || Date.now());
  const savedGame = next.games[gameId];
  const game: GameProgress = {
    runs: finite(savedGame?.runs), score: finite(savedGame?.score), correct: finite(savedGame?.correct), total: finite(savedGame?.total),
    perfectRuns: finite(savedGame?.perfectRuns), hardRuns: finite(savedGame?.hardRuns), hardPerfectRuns: finite(savedGame?.hardPerfectRuns), flawlessRuns: finite(savedGame?.flawlessRuns),
  };
  const day = next.days[dayKey] ?? { runs: 0, correct: 0, total: 0, games: [] };
  const stamps = new Set(next.stamps);
  if (gameId === "daily") stamps.add(`daily:${dayKey}`);
  if (gameId === "weekly") stamps.add(`weekly:${dayKey.slice(0, 7)}`);
  if (gameId === "expedition" && correct > 0) stamps.add(`expedition:${dayKey}`);

  const updated: ProgressionData = {
    ...next,
    totalRuns: next.totalRuns + 1,
    totalScore: next.totalScore + score,
    totalCorrect: next.totalCorrect + correct,
    totalQuestions: next.totalQuestions + total,
    maxScoreRun: Math.max(next.maxScoreRun, score),
    bestStreak: Math.max(next.bestStreak, finite(run.bestStreak)),
    games: {
      ...next.games,
      [gameId]: {
        runs: game.runs + 1,
        score: game.score + score,
        correct: game.correct + correct,
        total: game.total + total,
        perfectRuns: game.perfectRuns + (total > 0 && correct === total ? 1 : 0),
        hardRuns: game.hardRuns + (run.difficulty === "hard" ? 1 : 0),
        hardPerfectRuns: game.hardPerfectRuns + (run.difficulty === "hard" && total > 0 && correct === total ? 1 : 0),
        flawlessRuns: game.flawlessRuns + (typeof run.mode === "string" && run.mode.includes("flawless") ? 1 : 0),
      },
    },
    days: {
      ...next.days,
      [dayKey]: {
        runs: day.runs + 1,
        correct: day.correct + correct,
        total: day.total + total,
        games: [...new Set([...day.games, gameId])],
      },
    },
    stamps: [...stamps],
  };
  for (const mission of dailyMissions(updated, dayKey)) if (mission.complete) stamps.add(`mission:${dayKey}:${mission.id}`);
  if (weeklyMission(updated, run.createdAt || Date.now()).complete) stamps.add(`mission:week:${dayKey}`);
  return { ...updated, stamps: [...stamps] };
}

export function progressionFromRuns(runs: RunResult[]): ProgressionData {
  return runs.reduce(applyRun, { ...emptyProgression(), importedLegacyScores: true });
}

export type MissionKind = "variety" | "answers" | "strategy" | "discovery";
export interface Mission {
  id: string;
  kind: MissionKind;
  current: number;
  target: number;
  complete: boolean;
}

export function dailyMissions(data: ProgressionData, dayKey = localDayKey(Date.now())): Mission[] {
  const day = data.days[dayKey] ?? { runs: 0, correct: 0, total: 0, games: [] };
  const strategic = day.games.some((id) => id === "grid" || id === "minesweeper") ? 1 : 0;
  const selected = Number(dayKey.replaceAll("-", "")) % 2;
  const third: Mission = selected === 0
    ? { id: "daily-strategy", kind: "strategy", current: Math.min(1, strategic), target: 1, complete: strategic >= 1 }
    : { id: "daily-runs", kind: "variety", current: Math.min(3, day.runs), target: 3, complete: day.runs >= 3 };
  return [
    { id: "daily-variety", kind: "variety", current: day.games.length, target: 2, complete: day.games.length >= 2 },
    { id: "daily-answers", kind: "answers", current: day.correct, target: 10, complete: day.correct >= 10 },
    third,
  ];
}

export function weeklyMission(data: ProgressionData, now = Date.now()): Mission {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const since = start.getTime();
  const games = new Set<string>();
  for (const [key, day] of Object.entries(data.days)) {
    if (new Date(`${key}T00:00:00`).getTime() >= since) day.games.forEach((id) => games.add(id));
  }
  return { id: "weekly-variety", kind: "variety", current: games.size, target: 5, complete: games.size >= 5 };
}

export function recentActivity(data: ProgressionData, now = Date.now()): { key: string; runs: number }[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - offset));
    const key = localDayKey(date.getTime());
    return { key, runs: data.days[key]?.runs ?? 0 };
  });
}

export function correctForGame(data: ProgressionData, id: GameId): number {
  return data.games[id]?.correct ?? 0;
}
