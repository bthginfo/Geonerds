import type { Locale } from "./types";

/** XP needed to *reach* a given level (level 1 starts at 0). */
function xpForLevel(level: number): number {
  return 50 * level * (level - 1); // L1=0, L2=100, L3=300, L4=600, L5=1000, …
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
  { min: 5, en: "Explorer", de: "Entdecker" },
  { min: 8, en: "Navigator", de: "Navigator" },
  { min: 12, en: "Cartographer", de: "Kartograf" },
  { min: 16, en: "Geographer", de: "Geograf" },
  { min: 20, en: "Globetrotter", de: "Weltenbummler" },
  { min: 25, en: "Living Atlas", de: "Wandelnder Atlas" },
  { min: 30, en: "Geo Master", de: "Geo-Meister" },
  { min: 40, en: "Geo Legend", de: "Geo-Legende" },
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
