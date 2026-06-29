import type { Locale } from "./types";

/**
 * XP (= total score) needed to *reach* a given level. A steep, ever-growing
 * curve so the first few levels come quickly (a good first session gets you to
 * ~L4–5) but high levels are a real long-term grind worth chasing.
 *   L2≈250  L3≈700  L5≈2.3k  L10≈14k  L20≈90k  L30≈250k  L40≈520k  L50≈900k
 */
function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(140 * Math.pow(level - 1, 2.35) / 10) * 10;
}

export interface LevelInfo {
  level: number;
  /** XP earned within the current level. */
  intoLevel: number;
  /** XP span of the current level. */
  levelSpan: number;
  /** 0..1 progress to the next level. */
  progress: number;
  rank: { en: string; de: string };
}

const RANKS: { min: number; en: string; de: string }[] = [
  { min: 1, en: "Rookie", de: "Neuling" },
  { min: 3, en: "Wanderer", de: "Wanderer" },
  { min: 6, en: "Explorer", de: "Entdecker" },
  { min: 10, en: "Navigator", de: "Navigator" },
  { min: 14, en: "Cartographer", de: "Kartograf" },
  { min: 18, en: "Geographer", de: "Geograf" },
  { min: 22, en: "Globetrotter", de: "Weltenbummler" },
  { min: 27, en: "Living Atlas", de: "Wandelnder Atlas" },
  { min: 33, en: "Geo Master", de: "Geo-Meister" },
  { min: 40, en: "Geo Legend", de: "Geo-Legende" },
  { min: 50, en: "Geo Mythic", de: "Geo-Mythos" },
];

export function rankForLevel(level: number): { en: string; de: string } {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.min) r = rank;
  return r;
}

export function levelFromXp(xp: number): LevelInfo {
  const x = Math.max(0, xp);
  let level = 1;
  while (xpForLevel(level + 1) <= x) level += 1;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const levelSpan = next - base;
  const intoLevel = x - base;
  return {
    level,
    intoLevel,
    levelSpan,
    progress: levelSpan > 0 ? intoLevel / levelSpan : 0,
    rank: rankForLevel(level),
  };
}

export function rankName(rank: { en: string; de: string }, locale: Locale): string {
  return rank[locale] ?? rank.en;
}
