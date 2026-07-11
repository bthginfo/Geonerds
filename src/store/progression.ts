import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RunResult } from "@/lib/types";
import { applyRun, emptyProgression, migrateProgression, PROGRESSION_VERSION, type ProgressionData } from "@/lib/progression";

interface ProgressionState extends ProgressionData {
  recordRun: (run: RunResult) => void;
  importLegacy: (runs: RunResult[]) => void;
  reset: () => void;
}

export const useProgression = create<ProgressionState>()(
  persist(
    (set) => ({
      ...emptyProgression(),
      recordRun: (run) => set((state) => applyRun(state, run)),
      importLegacy: (runs) =>
        set((state) => {
          if (state.importedLegacyScores || state.totalRuns > 0) return { importedLegacyScores: true };
          const imported = runs.reduce(applyRun, { ...emptyProgression(), importedLegacyScores: true });
          return imported;
        }),
      reset: () => set({ ...emptyProgression(), importedLegacyScores: true }),
    }),
    {
      name: "geonerds-progression",
      version: PROGRESSION_VERSION,
      migrate: (persisted) => migrateProgression(persisted),
    }
  )
);
