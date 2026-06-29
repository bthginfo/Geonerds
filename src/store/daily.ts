import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DailyResult {
  date: string; // dateKey
  score: number;
  correct: number;
  total: number;
  /** Per-question correctness, for the shareable grid. */
  marks: boolean[];
}

interface DailyState {
  results: Record<string, DailyResult>;
  record: (r: DailyResult) => void;
}

export const useDaily = create<DailyState>()(
  persist(
    (set) => ({
      results: {},
      record: (r) => set((s) => ({ results: { ...s.results, [r.date]: r } })),
    }),
    { name: "geonerds-daily" }
  )
);
