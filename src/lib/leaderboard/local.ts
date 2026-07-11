import type { GameId, RunResult } from "@/lib/types";
import { useProgression } from "@/store/progression";
import type { ScoreEntry, ScoreStore } from "./types";

const KEY = "geonerds-scores";
const MAX_ENTRIES = 500;

function read(): ScoreEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ScoreEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: ScoreEntry[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* ignore quota errors */
  }
}

function ensureProgression(entries: ScoreEntry[]) {
  useProgression.getState().importLegacy(entries);
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const localScoreStore: ScoreStore = {
  async saveRun(result: RunResult) {
    const entry: ScoreEntry = { ...result, id: uid() };
    const all = read();
    ensureProgression(all);
    useProgression.getState().recordRun(result);
    all.push(entry);
    // The detailed journal is a recent-history window. Lifetime totals live in
    // the progression store and therefore remain exact beyond this cap.
    all.sort((a, b) => b.createdAt - a.createdAt);
    write(all);
    return entry;
  },

  async topScores({ gameId, limit = 20 }: { gameId?: GameId; limit?: number } = {}) {
    let all = read();
    ensureProgression(all);
    if (gameId) all = all.filter((e) => e.gameId === gameId);
    all.sort((a, b) => b.score - a.score || a.durationMs - b.durationMs);
    return all.slice(0, limit);
  },

  async bestScore(gameId: GameId) {
    const all = read().filter((e) => e.gameId === gameId);
    ensureProgression(read());
    return all.reduce((max, e) => Math.max(max, e.score), 0);
  },

  async allRuns() {
    const all = read();
    ensureProgression(all);
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async clear() {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    useProgression.getState().reset();
  },
};

export const scoreStore: ScoreStore = localScoreStore;
