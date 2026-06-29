import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WeeklyResult {
  week: string; // weekKey, e.g. "2026-W27"
  score: number;
  correct: number;
  total: number;
  /** Per-question correctness, for the shareable grid. */
  marks: boolean[];
}

interface WeeklyState {
  results: Record<string, WeeklyResult>;
  record: (r: WeeklyResult) => void;
}

export const useWeekly = create<WeeklyState>()(
  persist(
    (set) => ({
      results: {},
      record: (r) => set((s) => ({ results: { ...s.results, [r.week]: r } })),
    }),
    { name: "geonerds-weekly" }
  )
);
