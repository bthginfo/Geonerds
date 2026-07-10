import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getExpeditionRoute, type ExpeditionRouteId } from "@/games/expedition/routes";

export interface ExpeditionRunState {
  routeId: ExpeditionRouteId;
  checkpointIndex: number;
  energy: number;
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  durationMs: number;
  stars: number[];
  branches: Record<number, string>;
  countryHits: string[];
  startedAt: number;
}

export interface ExpeditionRecord {
  bestScore: number;
  bestStars: number;
  completions: number;
}

interface ExpeditionState {
  active: ExpeditionRunState | null;
  records: Partial<Record<ExpeditionRouteId, ExpeditionRecord>>;
  setActive: (active: ExpeditionRunState | null) => void;
  start: (routeId: ExpeditionRouteId) => void;
  finish: (run: ExpeditionRunState) => void;
  clear: () => void;
}

export function newExpeditionRun(routeId: ExpeditionRouteId): ExpeditionRunState {
  return { routeId, checkpointIndex: 0, energy: 3, score: 0, correct: 0, total: 0, bestStreak: 0, durationMs: 0, stars: [], branches: {}, countryHits: [], startedAt: Date.now() };
}

export function isValidExpeditionRun(value: ExpeditionRunState | null): value is ExpeditionRunState {
  if (!value || !getExpeditionRoute(value.routeId)) return false;
  return Number.isInteger(value.checkpointIndex) && value.checkpointIndex >= 0 && value.checkpointIndex <= 6 && value.energy >= 0 && value.energy <= 3 && Array.isArray(value.stars) && Array.isArray(value.countryHits);
}

export const useExpedition = create<ExpeditionState>()(
  persist(
    (set, get) => ({
      active: null,
      records: {},
      setActive: (active) => set({ active }),
      start: (routeId) => set({ active: newExpeditionRun(routeId) }),
      finish: (run) => {
        const previous = get().records[run.routeId];
        set({
          active: null,
          records: {
            ...get().records,
            [run.routeId]: {
              bestScore: Math.max(previous?.bestScore ?? 0, run.score),
              bestStars: Math.max(previous?.bestStars ?? 0, run.stars.reduce((sum, value) => sum + value, 0)),
              completions: (previous?.completions ?? 0) + 1,
            },
          },
        });
      },
      clear: () => set({ active: null, records: {} }),
    }),
    { name: "geonerds-expedition", version: 1 }
  )
);
