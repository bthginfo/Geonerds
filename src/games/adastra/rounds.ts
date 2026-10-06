import { ADASTRA_CATALOG, ADASTRA_CITIES, ADASTRA_PHOTOS, type NightCity, type NightPhoto } from "@/data/adastra";
import legacyPhotoIds from "@/data/adastra-city-v1-photo-ids.json";
import networkPhotoIds from "@/data/adastra-network-v2-photo-ids.json";
import expandedPhotoIds from "@/data/adastra-expanded-v3-photo-ids.json";
import type { AdastraCatalogVersion } from "@/lib/adastra-catalog-version";
import { seededShuffle } from "@/lib/random";
import { scoreForAnswer } from "@/lib/scoring";
import type { Difficulty } from "@/lib/types";

export type AdastraRound = { photo: NightPhoto; city: NightCity; options: NightCity[] };

// Long Beach is part of the Los Angeles metro; broad ISS views can show both.
// Never offer the encompassing city and its port as competing answers.
const overlappingCities = new Set(["long-beach", "los-angeles"]);
const originalFrames = new Set(legacyPhotoIds);
const networkFrames = new Set(networkPhotoIds);
const expandedFrames = new Set(expandedPhotoIds);
const targetKind = (target: NightCity) => target.kind ?? "city";
const overlap = (a: NightCity, b: NightCity) => a.overlaps?.includes(b.id) || b.overlaps?.includes(a.id)
  || (overlappingCities.has(a.id) && overlappingCities.has(b.id));

/** Guarantee some contextual variety without fixed opening questions or repeated places. */
function includeNetworkViews(available: string[], cities: Map<string, NightCity>, seed: string, limit: number) {
  if (limit < 10) return;
  const kinds = seededShuffle([...new Set(available.map((id) => targetKind(cities.get(id)!)))]
    .filter((kind) => kind !== "city"), `${seed}:network-kinds`);
  const targets = kinds.map((kind) => available.find((id) => targetKind(cities.get(id)!) === kind)!).slice(0, 2);
  if (targets.length === 1) {
    const another = available.find((id) => id !== targets[0] && targetKind(cities.get(id)!) !== "city");
    if (another) targets.push(another);
  }
  const window = Math.min(10, available.length);
  const positions = seededShuffle(Array.from({ length: window }, (_, i) => i), `${seed}:network-positions`);
  for (const id of targets) {
    const index = available.indexOf(id);
    if (index < window) continue;
    const position = positions.find((i) => targetKind(cities.get(available[i])!) === "city");
    if (position !== undefined) [available[index], available[position]] = [available[position], available[index]];
  }
}

/** Balance targets before revisiting them; never repeat a source photo within a run. */
export function makeAdastraRounds({ seed, rounds, difficulty, catalogVersion = "current" }: {
  seed: string; rounds: number; difficulty: Difficulty; catalogVersion?: AdastraCatalogVersion;
}): AdastraRound[] {
  const legacy = catalogVersion === "city-v1";
  const frameIds = legacy ? originalFrames : catalogVersion === "network-v2" ? networkFrames
    : catalogVersion === "expanded-v3" ? expandedFrames : undefined;
  const library = frameIds ? ADASTRA_CATALOG.photos.filter((photo) => frameIds.has(photo.id)) : ADASTRA_PHOTOS;
  const includedIds = new Set(library.map((photo) => photo.cityId));
  const pool = (frameIds ? ADASTRA_CATALOG.cities : ADASTRA_CITIES).filter((city) => includedIds.has(city.id));
  const cities = new Map(pool.map((city) => [city.id, city]));
  const buckets = new Map<string, NightPhoto[]>();
  for (const photo of library) {
    if (!cities.has(photo.cityId)) continue;
    const bucket = buckets.get(photo.cityId) ?? [];
    bucket.push(photo);
    buckets.set(photo.cityId, bucket);
  }
  for (const [cityId, photos] of buckets) buckets.set(cityId, seededShuffle(photos, `${seed}:photos:${cityId}`));
  const limit = rounds === 0 ? library.length
    : Math.min(library.length, Math.max(1, Number.isSafeInteger(rounds) ? rounds : 10));
  const ordered: NightPhoto[] = [];
  let cycle = 0;
  while (ordered.length < limit) {
    const available = seededShuffle([...buckets.keys()].filter((id) => buckets.get(id)!.length), `${seed}:cities:${cycle}`);
    if (cycle === 0 && !legacy) includeNetworkViews(available, cities, seed, limit);
    cycle++;
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
    const others = pool.filter((item) => item.id !== city.id && targetKind(item) === targetKind(city)
      && !overlap(city, item));
    const sameRegion = others.filter((item) => item.region === city.region);
    const sameCountry = sameRegion.filter((item) => item.cca3 === city.cca3);
    const parts = difficulty === "easy" ? [others]
      : difficulty === "hard" ? [sameCountry, sameRegion, others] : [sameRegion, others];
    const choices = new Map<string, NightCity>();
    for (const [index, part] of parts.entries()) {
      for (const candidate of seededShuffle(part, `${seed}:options:${photo.id}:${index}`)) {
        if (choices.size < 3 && (legacy || [...choices.values()].every((other) => !overlap(other, candidate)))) {
          choices.set(candidate.id, candidate);
        }
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
