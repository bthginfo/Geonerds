import type { Country, Locale } from "@/lib/types";

/** Extra accepted spellings for typing answers, keyed by cca3. */
export const COUNTRY_ALIASES: Record<string, string[]> = {
  USA: ["USA", "US", "United States", "United States of America", "America", "Amerika", "Vereinigte Staaten"],
  GBR: ["UK", "United Kingdom", "Great Britain", "Britain", "Großbritannien", "Vereinigtes Königreich", "England"],
  ARE: ["UAE", "United Arab Emirates", "Emirates", "Vereinigte Arabische Emirate"],
  COD: ["DR Congo", "DRC", "Democratic Republic of the Congo", "Congo-Kinshasa", "Demokratische Republik Kongo", "Kongo"],
  COG: ["Congo", "Republic of the Congo", "Congo-Brazzaville", "Kongo", "Republik Kongo"],
  CZE: ["Czech Republic", "Czechia", "Tschechien", "Tschechische Republik"],
  MMR: ["Burma", "Myanmar"],
  SWZ: ["Swaziland", "Eswatini"],
  CPV: ["Cabo Verde", "Cape Verde", "Kap Verde"],
  CIV: ["Cote d'Ivoire", "Côte d'Ivoire", "Ivory Coast", "Elfenbeinküste"],
  KOR: ["South Korea", "Korea", "Republic of Korea", "Südkorea"],
  PRK: ["North Korea", "DPRK", "Nordkorea"],
  NLD: ["Holland", "Netherlands", "Niederlande"],
  RUS: ["Russia", "Russian Federation", "Russland"],
  VAT: ["Vatican", "Vatican City", "Holy See", "Vatikan", "Vatikanstadt"],
  TLS: ["East Timor", "Timor-Leste", "Osttimor"],
  TUR: ["Turkey", "Türkiye", "Türkei"],
  GMB: ["Gambia", "The Gambia"],
  MKD: ["North Macedonia", "Macedonia", "Nordmazedonien", "Mazedonien"],
  BIH: ["Bosnia", "Bosnia and Herzegovina", "Bosnien", "Bosnien und Herzegowina"],
  STP: ["Sao Tome and Principe", "São Tomé and Príncipe", "São Tomé und Príncipe"],
  TWN: ["Taiwan", "Republic of China"],
  LAO: ["Laos", "Lao"],
  SVK: ["Slovakia", "Slowakei"],
  SVN: ["Slovenia", "Slowenien"],
};

/** German capital names where they differ from the English/default. Keyed by cca3. */
export const CAPITAL_DE: Record<string, string> = {
  RUS: "Moskau",
  AUT: "Wien",
  ITA: "Rom",
  BEL: "Brüssel",
  DNK: "Kopenhagen",
  EGY: "Kairo",
  GRC: "Athen",
  POL: "Warschau",
  CZE: "Prag",
  PRT: "Lissabon",
  ROU: "Bukarest",
  SRB: "Belgrad",
  UKR: "Kiew",
  GEO: "Tiflis",
  ARM: "Eriwan",
  CHN: "Peking",
  JPN: "Tokio",
  IND: "Neu-Delhi",
  IRN: "Teheran",
  IRQ: "Bagdad",
  SAU: "Riad",
  SYR: "Damaskus",
  DZA: "Algier",
  ETH: "Addis Abeba",
  MEX: "Mexiko-Stadt",
  USA: "Washington",
  CYP: "Nikosia",
  MDA: "Chișinău",
  LBY: "Tripolis",
  TUN: "Tunis",
  MNE: "Podgorica",
  ALB: "Tirana",
};

export function countryAccepted(c: Country): string[] {
  const set = new Set<string>([c.name.en, c.name.de, ...(COUNTRY_ALIASES[c.cca3] ?? [])]);
  return Array.from(set);
}

export function capitalLabel(c: Country, locale: Locale): string {
  if (locale === "de" && CAPITAL_DE[c.cca3]) return CAPITAL_DE[c.cca3];
  return c.capital ?? "";
}

export function capitalAccepted(c: Country): string[] {
  const set = new Set<string>();
  if (c.capital) {
    set.add(c.capital);
    // also accept just the first token for "Washington, D.C." style names
    set.add(c.capital.replace(/,.*$/, "").trim());
  }
  if (CAPITAL_DE[c.cca3]) set.add(CAPITAL_DE[c.cca3]);
  return Array.from(set).filter(Boolean);
}
