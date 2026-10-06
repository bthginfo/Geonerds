import catalog from "./adastra-catalog.json";

export type NightCity = {
  id: string;
  name: { en: string; de: string };
  aliases: readonly string[];
  cca3: string;
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
};

export const ADASTRA_CREDIT = "Image courtesy of the Earth Science and Remote Sensing Unit, NASA Johnson Space Center";
export const ADASTRA_USAGE_URL = "https://eol.jsc.nasa.gov/FAQ/";
export const ADASTRA_CITIES = catalog.cities as unknown as readonly NightCity[];
export const ADASTRA_PHOTOS = catalog.photos as unknown as readonly NightPhoto[];
