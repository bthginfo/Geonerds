import type { Country, Difficulty } from "@/lib/types";
import { seededShuffle } from "@/lib/random";

export interface FlagColor { hex: string; share: number }
export interface FlagPalette { colors: FlagColor[]; source?: string }
export type FlagPalettes = Record<string, FlagPalette>;
export interface FlagPieRound { answer: Country; options: Country[]; palette: FlagPalette }

/** Compare ink families, not exact RGB: slight shade/emblem changes are not fair decoys. */
export function colorFamily(hex: string): string {
  const channels = hex.replace("#", "").match(/.{2}/g)?.map((part) => parseInt(part, 16)) ?? [0, 0, 0];
  const [r, g, b] = channels.map((value) => value / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (max < 0.24) return "black";
  if (delta < 0.12) return max > 0.78 ? "white" : "gray";
  let hue = delta === 0 ? 0 : max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 22 || hue >= 335) return "red";
  if (hue < 43) return "orange";
  if (hue < 75) return "yellow";
  if (hue < 170) return "green";
  if (hue < 270) return "blue";
  return "purple";
}

export function paletteHistogram(palette: FlagPalette): Record<string, number> {
  const histogram: Record<string, number> = {};
  for (const color of palette.colors) {
    const family = colorFamily(color.hex);
    histogram[family] = (histogram[family] ?? 0) + color.share;
  }
  return histogram;
}

/** Total variation distance: 0 is indistinguishable, 1 shares no ink families. */
export function paletteDistance(a: FlagPalette, b: FlagPalette): number {
  return histogramDistance(paletteHistogram(a), paletteHistogram(b));
}

function histogramDistance(left: Record<string, number>, right: Record<string, number>): number {
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .reduce((sum, color) => sum + Math.abs((left[color] ?? 0) - (right[color] ?? 0)), 0) / 2;
}

export const MIN_PALETTE_DISTANCE = 0.16;

export function validPalette(palette: FlagPalette | undefined): palette is FlagPalette {
  return Boolean(palette && palette.colors.length >= 2 && palette.colors.every((color) =>
    /^#[\da-f]{6}$/i.test(color.hex) && Number.isFinite(color.share) && color.share > 0,
  ) && Math.abs(palette.colors.reduce((sum, color) => sum + color.share, 0) - 1) < 0.001);
}

export function buildFlagPieRounds(pool: readonly Country[], palettes: FlagPalettes, difficulty: Difficulty, count: number, seed: string): FlagPieRound[] {
  const usable = pool.filter((country) => validPalette(palettes[country.flag]));
  const histograms = new Map(usable.map((country) => [country.flag, paletteHistogram(palettes[country.flag])]));
  const candidates = seededShuffle(usable, `${seed}:flag-pie:targets`);
  const rounds: FlagPieRound[] = [];
  for (const answer of candidates) {
    const palette = palettes[answer.flag];
    const distances = new Map(usable.map((country) => [country.flag, histogramDistance(histograms.get(answer.flag)!, histograms.get(country.flag)!)]));
    const distractors = seededShuffle(usable.filter((country) => country.cca3 !== answer.cca3 &&
      distances.get(country.flag)! >= MIN_PALETTE_DISTANCE,
    ), `${seed}:flag-pie:${answer.cca3}:decoys`);
    if (difficulty === "hard") distractors.sort((a, b) => distances.get(a.flag)! - distances.get(b.flag)!);
    if (difficulty === "easy") distractors.sort((a, b) => distances.get(b.flag)! - distances.get(a.flag)!);
    if (distractors.length < 3) continue;
    rounds.push({ answer, palette, options: seededShuffle([answer, ...distractors.slice(0, 3)], `${seed}:flag-pie:${answer.cca3}:options`) });
    if (count > 0 && rounds.length >= count) break;
  }
  return rounds;
}

export function donutSlicePath(start: number, end: number, outer = 105, inner = 63): string {
  const point = (turn: number, radius: number) => {
    const angle = turn * Math.PI * 2 - Math.PI / 2;
    return `${(120 + Math.cos(angle) * radius).toFixed(4)} ${(120 + Math.sin(angle) * radius).toFixed(4)}`;
  };
  const large = end - start > 0.5 ? 1 : 0;
  return `M ${point(start, outer)} A ${outer} ${outer} 0 ${large} 1 ${point(end, outer)} L ${point(end, inner)} A ${inner} ${inner} 0 ${large} 0 ${point(start, inner)} Z`;
}
