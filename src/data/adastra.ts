import catalog from "./adastra-catalog.json";

export type NightTargetKind = "city" | "metro" | "state" | "region";

export type NightCity = {
  id: string;
  /** Missing on the original catalogue: a city, not a larger surrounding area. */
  kind?: NightTargetKind;
  name: { en: string; de: string };
  aliases: readonly string[];
  cca3: string;
  /** Larger areas may cross borders; do not assign only their primary country. */
  countryCodes?: readonly string[];
  /** Do not offer a containing and contained region as competing answers. */
  overlaps?: readonly string[];
  region: string;
  regionHint: { en: string; de: string };
  clue: { en: string; de: string };
  explanation: { en: string; de: string };
  latlng: readonly [number, number];
};

export type NightPhoto = {
  id: string;
  cityId: string;
  src: string;
  sourceUrl: string;
  title: string;
  capturedAt?: string;
  credit: string;
  /** Archived for published duels only; unsuitable for new games. */
  retired?: boolean;
};

export const ADASTRA_CREDIT = "Image courtesy of the Earth Science and Remote Sensing Unit, NASA Johnson Space Center";
export const ADASTRA_USAGE_URL = "https://eol.jsc.nasa.gov/FAQ/";
/** Keep source records and assets immutable for already-published duel seeds. */
export const ADASTRA_CATALOG = {
  cities: catalog.cities as unknown as readonly NightCity[],
  photos: catalog.photos as unknown as readonly NightPhoto[],
};
export const ADASTRA_PHOTOS = ADASTRA_CATALOG.photos.filter((photo) => !photo.retired);
const activeTargetIds = new Set(ADASTRA_PHOTOS.map((photo) => photo.cityId));
export const ADASTRA_CITIES = ADASTRA_CATALOG.cities.filter((city) => activeTargetIds.has(city.id));
