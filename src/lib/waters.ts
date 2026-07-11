import type { Difficulty } from "@/lib/types";

export interface Water {
  id: string;
  kind: "river" | "lake";
  name: string;
  nameDe?: string;
  accepted: string[];
  tier: 1 | 2 | 3;
  geometry: GeoJSON.Geometry;
}

let cache: Promise<Water[]> | null = null;

export function loadWaters(): Promise<Water[]> {
  if (!cache) {
    cache = fetch("/geo/waters.json").then((r) => r.json());
  }
  return cache;
}

export function waterLabel(w: Water, locale: string): string {
  return locale === "de" && w.nameDe ? w.nameDe : w.name;
}

export function waterPoolForDifficulty(waters: Water[], difficulty: Difficulty): Water[] {
  const maxTier = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  return waters.filter((water) => water.tier <= maxTier);
}
