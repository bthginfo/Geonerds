import capitals from "../../../public/geo/capitals.json";
import { COUNTRIES } from "@/data/countries";
import { CAPITAL_DE } from "@/games/aliases";
import { PLACES } from "@/games/pin/places";
import type { Difficulty, Locale } from "@/lib/types";

export interface CompassCity {
  id: string;
  name: { en: string; de: string };
  lat: number;
  lng: number;
  cca3: string;
  tier: number;
}

// Only the real city entries of PLACES, never landmarks or country centroids.
const EXTRA_CITY_CODES: Record<string, string> = {
  "New York City": "USA", "Los Angeles": "USA", Chicago: "USA", Houston: "USA", Miami: "USA",
  "San Francisco": "USA", Seattle: "USA", Boston: "USA", Honolulu: "USA",
  Toronto: "CAN", Vancouver: "CAN", Montreal: "CAN",
  Guadalajara: "MEX", Monterrey: "MEX", "Rio de Janeiro": "BRA", "São Paulo": "BRA",
  Medellín: "COL", Guayaquil: "ECU", Mumbai: "IND", Bengaluru: "IND", Kolkata: "IND",
  Karachi: "PAK", Istanbul: "TUR", Dubai: "ARE", Shanghai: "CHN", Guangzhou: "CHN", "Hong Kong": "CHN",
  Osaka: "JPN", Busan: "KOR", "Ho Chi Minh City": "VNM", "Tel Aviv": "ISR", Isfahan: "IRN",
  Casablanca: "MAR", Alexandria: "EGY", Lagos: "NGA", "Cape Town": "ZAF", Johannesburg: "ZAF",
  Sydney: "AUS", Melbourne: "AUS", Perth: "AUS", Auckland: "NZL", Barcelona: "ESP",
  Munich: "DEU", Milan: "ITA", Hamburg: "DEU", Naples: "ITA", Marseille: "FRA", Zurich: "CHE",
  Porto: "PRT", Seville: "ESP", Kraków: "POL", "Saint Petersburg": "RUS", Vladivostok: "RUS",
};

const countryByCode = new Map(COUNTRIES.map((country) => [country.cca3, country]));
export const COMPASS_CITIES: CompassCity[] = [
  ...capitals.flatMap((capital) => {
    const country = countryByCode.get(capital.code);
    if (!country) return [];
    return [{
      id: `capital:${capital.code}`,
      name: { en: capital.en, de: CAPITAL_DE[capital.code] ?? capital.en },
      lat: capital.lat,
      lng: capital.lng,
      cca3: capital.code,
      tier: country.difficulty,
    }];
  }),
  ...PLACES.flatMap((place) => {
    const cca3 = EXTRA_CITY_CODES[place.en];
    if (!cca3) return [];
    return [{ id: `city:${place.en}`, name: { en: place.en, de: place.de }, lat: place.lat, lng: place.lng, cca3, tier: 1 }];
  }),
];

export function cityLabel(city: CompassCity, locale: Locale): string { return city.name[locale]; }

export function cityPool(difficulty: Difficulty): CompassCity[] {
  const maxTier = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 4;
  return COMPASS_CITIES.filter((city) => city.tier <= maxTier);
}
