import { ADASTRA_CITIES, ADASTRA_PHOTOS, type NightCity, type NightPhoto } from "@/data/adastra";
import { seededShuffle } from "@/lib/random";
import { scoreForAnswer } from "@/lib/scoring";
import type { Difficulty } from "@/lib/types";

export type AdastraRound = { photo: NightPhoto; city: NightCity; options: NightCity[] };

// Long Beach is part of the Los Angeles metro; broad ISS views can show both.
// Never offer the encompassing city and its port as competing answers.
const overlappingCities = new Set(["long-beach", "los-angeles"]);

/** Balance cities before revisiting them; never repeat a source photo within a run. */
export function makeAdastraRounds({ seed, rounds, difficulty }: {
  seed: string; rounds: number; difficulty: Difficulty;
}): AdastraRound[] {
  const cities = new Map(ADASTRA_CITIES.map((city) => [city.id, city]));
  const buckets = new Map<string, NightPhoto[]>();
  for (const photo of ADASTRA_PHOTOS) {
    if (!cities.has(photo.cityId)) continue;
    const bucket = buckets.get(photo.cityId) ?? [];
    bucket.push(photo);
    buckets.set(photo.cityId, bucket);
  }
  for (const [cityId, photos] of buckets) buckets.set(cityId, seededShuffle(photos, `${seed}:photos:${cityId}`));
  const limit = rounds === 0 ? ADASTRA_PHOTOS.length
    : Math.min(ADASTRA_PHOTOS.length, Math.max(1, Number.isSafeInteger(rounds) ? rounds : 10));
  const ordered: NightPhoto[] = [];
  let cycle = 0;
  while (ordered.length < limit) {
    const available = seededShuffle([...buckets.keys()].filter((id) => buckets.get(id)!.length), `${seed}:cities:${cycle++}`);
    if (!available.length) break;
    if (available.length > 1 && available[0] === ordered.at(-1)?.cityId) {
      [available[0], available[1]] = [available[1], available[0]];
    }
    for (const cityId of available) {
      ordered.push(buckets.get(cityId)!.pop()!);
      if (ordered.length >= limit) break;
    }
  }
  return ordered.map((photo) => {
    const city = cities.get(photo.cityId)!;
    const others = ADASTRA_CITIES.filter((item) => item.id !== city.id
      && !(overlappingCities.has(city.id) && overlappingCities.has(item.id)));
    const sameRegion = others.filter((item) => item.region === city.region);
    const sameCountry = sameRegion.filter((item) => item.cca3 === city.cca3);
    const parts = difficulty === "easy" ? [others]
      : difficulty === "hard" ? [sameCountry, sameRegion, others] : [sameRegion, others];
    const choices = new Map<string, NightCity>();
    for (const [index, part] of parts.entries()) {
      for (const candidate of seededShuffle(part, `${seed}:options:${photo.id}:${index}`)) {
        if (choices.size < 3) choices.set(candidate.id, candidate);
      }
    }
    return { photo, city, options: seededShuffle([city, ...choices.values()], `${seed}:positions:${photo.id}`) };
  });
}

/** Explicit fixed hint cost, independent of network/photo-loading speed. */
export function adastraAnswerScore(difficulty: Difficulty, revealedHints: number, practice = false): number {
  if (practice) return 0;
  const count = Math.min(2, Math.max(0, Number.isFinite(revealedHints) ? Math.floor(revealedHints) : 0));
  return Math.round(scoreForAnswer({ correct: true, difficulty }) * (1 - count * 0.25));
}
