import snapshot from "@/data/climate-profiles.json";
import { CAPITAL_DE } from "@/games/aliases";
import type { Difficulty, Locale } from "@/lib/types";
import { createSeededRandom } from "@/lib/random";
import { shuffle } from "@/lib/utils";
import { finiteCount } from "@/games/new-world/counts";

export interface ClimateProfile {
  id: string; name: Record<Locale, string>; cca3: string; lat: number; lng: number;
  temperatureC: number[]; precipitationMm: number[]; sourceUrl: string;
}
export interface ClimateRound { id: string; answer: ClimateProfile; options: ClimateProfile[] }
export const CLIMATE_META = snapshot.meta;
export const CLIMATE_PROFILES: ClimateProfile[] = snapshot.profiles.map((profile) => ({
  ...profile, name: { ...profile.name, de: profile.id.startsWith("capital:") ? CAPITAL_DE[profile.cca3] ?? profile.name.de : profile.name.de },
}));
/** Transparent separation heuristic, not a formal climate classification. */
export function climateDistance(a: ClimateProfile, b: ClimateProfile): number {
  return a.temperatureC.reduce((sum, temperature, index) => sum + Math.abs(temperature - b.temperatureC[index]) / 10 +
    Math.abs(Math.log1p(a.precipitationMm[index]) - Math.log1p(b.precipitationMm[index])) / 2, 0) / 12;
}
export const CLIMATE_SEPARATION: Record<Difficulty, number> = { easy: 1.9, medium: 1.6, hard: 1.1 };
export function buildClimateRounds(difficulty: Difficulty, count: number, seed: string): ClimateRound[] {
  const random = createSeededRandom(`${seed}:climate-passport`);
  const questions = shuffle(CLIMATE_PROFILES, random).flatMap((answer) => {
    const candidates = shuffle(CLIMATE_PROFILES.filter((profile) => profile.cca3 !== answer.cca3 && climateDistance(answer, profile) >= CLIMATE_SEPARATION[difficulty]), random);
    if (difficulty === "hard") candidates.sort((a, b) => climateDistance(answer, a) - climateDistance(answer, b));
    const selected: ClimateProfile[] = [];
    for (const candidate of candidates) {
      if (selected.some((profile) => profile.cca3 === candidate.cca3)) continue;
      selected.push(candidate);
      if (selected.length === 3) break;
    }
    if (selected.length < 3) return [];
    return [{ id: `${seed}:climate:${answer.id}`, answer, options: shuffle([answer, ...selected], random) }];
  });
  return questions.slice(0, finiteCount(count, questions.length));
}
export function climatePoints(hints: number): number {
  return 1000 - Math.min(2, Math.max(0, Number.isFinite(hints) ? Math.floor(hints) : 0)) * 200;
}
export function climateInsights(profile: ClimateProfile, locale: Locale): string[] {
  const de = locale === "de";
  const number = (value: number, digits = 0) => new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
  const month = (index: number) => new Intl.DateTimeFormat(locale, { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2020, index, 15)));
  const warm = profile.temperatureC.indexOf(Math.max(...profile.temperatureC));
  const cold = profile.temperatureC.indexOf(Math.min(...profile.temperatureC));
  const wet = profile.precipitationMm.indexOf(Math.max(...profile.precipitationMm));
  const totalRain = profile.precipitationMm.reduce((sum, value) => sum + value, 0);
  const range = profile.temperatureC[warm] - profile.temperatureC[cold];
  return de ? [
    `Wärmster Monat: ${month(warm)} mit ${number(profile.temperatureC[warm], 1)} °C im Monatsmittel.`,
    `Kältester Monat: ${month(cold)}. Die Jahresspanne der Monatsmittel beträgt ${number(range, 1)} °C.`,
    `Niederschlag: etwa ${number(totalRain)} mm pro Jahr; der niederschlagsreichste Monat ist ${month(wet)} (${number(profile.precipitationMm[wet])} mm).`,
  ] : [
    `Warmest month: ${month(warm)}, averaging ${number(profile.temperatureC[warm], 1)} °C.`,
    `Coldest month: ${month(cold)}. Monthly mean temperatures span ${number(range, 1)} °C across the year.`,
    `Precipitation: about ${number(totalRain)} mm a year; the wettest month is ${month(wet)} (${number(profile.precipitationMm[wet])} mm).`,
  ];
}
