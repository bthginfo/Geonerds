import { COMPASS_CITIES, type CompassCity } from "@/games/city-compass/cities";
import type { Difficulty } from "@/lib/types";

export type GeoCity = CompassCity;
export { packCount, finiteCount } from "./counts";
export const WORLD_CITIES: GeoCity[] = COMPASS_CITIES.filter((city, index, all) =>
  all.findIndex((candidate) => candidate.cca3 === city.cca3 && candidate.name.en === city.name.en) === index,
);

export function worldCityPool(difficulty: Difficulty): GeoCity[] {
  const tier = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 4;
  return WORLD_CITIES.filter((city) => city.tier <= tier);
}
