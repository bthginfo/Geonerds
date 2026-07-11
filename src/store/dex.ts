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
  favorites: string[];
  record: (gameId: string, cca3s: string[]) => void;
  toggleFavorite: (cca3: string) => void;
  reset: () => void;
}

export const useDex = create<DexState>()(
  persist(
    (set) => ({
      hits: {},
      favorites: [],
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
      toggleFavorite: (cca3) =>
        set((s) => ({ favorites: s.favorites.includes(cca3) ? s.favorites.filter((id) => id !== cca3) : [...s.favorites, cca3] })),
      reset: () => set({ hits: {}, favorites: [] }),
    }),
    {
      name: "geonerds-dex",
      version: 2,
      migrate: (value) => {
        const old = (value ?? {}) as Partial<DexState>;
        return { ...old, hits: old.hits ?? {}, favorites: Array.isArray(old.favorites) ? old.favorites : [] };
      },
    }
  )
);
