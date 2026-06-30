import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The country collection ("Geo-Dex"). Every time you answer a country correctly
 * in any game it gains progress. A single game contributes at most PER_GAME_CAP,
 * so fully unlocking a country (UNLOCK_TOTAL) means getting it right across
 * several different games.
 */
export interface DexState {
  /** cca3 -> gameId -> correct count. */
  hits: Record<string, Record<string, number>>;
  record: (gameId: string, cca3s: string[]) => void;
  reset: () => void;
}

export const useDex = create<DexState>()(
  persist(
    (set) => ({
      hits: {},
      record: (gameId, cca3s) =>
        set((s) => {
          if (!cca3s.length) return s;
          const hits = { ...s.hits };
          for (const cca3 of cca3s) {
            if (!cca3) continue;
            const per = { ...(hits[cca3] ?? {}) };
            per[gameId] = (per[gameId] ?? 0) + 1;
            hits[cca3] = per;
          }
          return { hits };
        }),
      reset: () => set({ hits: {} }),
    }),
    { name: "geonerds-dex" }
  )
);
