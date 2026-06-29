import type { Country, Locale } from "./types";
import { getCountryByCca3 } from "@/data/countries";
import { COUNTRY_FACTS } from "./country-facts";
import { formatNumber, pickOne, shuffle } from "./utils";

const REGION_DE: Record<string, string> = {
  Africa: "Afrika",
  Americas: "Amerika",
  Asia: "Asien",
  Europe: "Europa",
  Oceania: "Ozeanien",
  Antarctic: "Antarktis",
};

const SUBREGION_DE: Record<string, string> = {
  "Northern Africa": "Nordafrika",
  "Sub-Saharan Africa": "Subsahara-Afrika",
  "Eastern Africa": "Ostafrika",
  "Middle Africa": "Zentralafrika",
  "Southern Africa": "Südliches Afrika",
  "Western Africa": "Westafrika",
  "Northern America": "Nordamerika",
  "Central America": "Mittelamerika",
  "South America": "Südamerika",
  Caribbean: "Karibik",
  "Central Asia": "Zentralasien",
  "Eastern Asia": "Ostasien",
  "South-Eastern Asia": "Südostasien",
  "Southern Asia": "Südasien",
  "Western Asia": "Westasien",
  "Eastern Europe": "Osteuropa",
  "Northern Europe": "Nordeuropa",
  "Southern Europe": "Südeuropa",
  "Western Europe": "Westeuropa",
  "Australia and New Zealand": "Australien und Neuseeland",
  Melanesia: "Melanesien",
  Micronesia: "Mikronesien",
  Polynesia: "Polynesien",
};

function regionName(c: Country, locale: Locale) {
  return locale === "de" ? REGION_DE[c.region] ?? c.region : c.region;
}
function subregionName(c: Country, locale: Locale) {
  return locale === "de" ? SUBREGION_DE[c.subregion] ?? c.subregion : c.subregion;
}

function populationPhrase(c: Country, locale: Locale): string | null {
  if (!c.population) return null;
  if (c.population >= 1_000_000) {
    const millions = c.population / 1_000_000;
    const val = millions >= 10 ? Math.round(millions) : Math.round(millions * 10) / 10;
    return locale === "de"
      ? `Heimat von rund ${formatNumber(val, locale)} Millionen Menschen.`
      : `Home to around ${formatNumber(val, locale)} million people.`;
  }
  return locale === "de"
    ? `Hat weniger als eine Million Einwohner.`
    : `Has fewer than a million inhabitants.`;
}

function areaPhrase(c: Country, locale: Locale): string | null {
  if (!c.area) return null;
  return locale === "de"
    ? `Erstreckt sich über rund ${formatNumber(c.area, locale)} km².`
    : `Covers around ${formatNumber(c.area, locale)} km².`;
}

function bordersPhrase(c: Country, locale: Locale): string {
  const n = c.borders.length;
  if (n === 0) {
    return locale === "de" ? `Hat keine Landgrenzen (Inselstaat).` : `Has no land borders (an island nation).`;
  }
  return locale === "de" ? `Grenzt an ${n} andere Länder.` : `Shares a land border with ${n} other countries.`;
}

function landlockedPhrase(c: Country, locale: Locale): string | null {
  if (!c.landlocked) return null;
  return locale === "de" ? `Ist ein Binnenstaat ohne Meereszugang.` : `It is landlocked, with no sea access.`;
}

function hemispherePhrase(c: Country, locale: Locale): string | null {
  if (!c.latlng) return null;
  const north = c.latlng[0] >= 0;
  return locale === "de"
    ? `Liegt auf der ${north ? "Nordhalbkugel" : "Südhalbkugel"}.`
    : `Lies in the ${north ? "northern" : "southern"} hemisphere.`;
}

function languagePhrase(c: Country, locale: Locale): string | null {
  if (!c.languages.length) return null;
  const lang = c.languages[0];
  return locale === "de" ? `Eine Amtssprache ist ${lang}.` : `One official language is ${lang}.`;
}

function currencyPhrase(c: Country, locale: Locale): string | null {
  if (!c.currencies.length) return null;
  const cur = c.currencies[0];
  return locale === "de" ? `Die Währung ist der ${cur}.` : `Its currency is the ${cur}.`;
}

function capitalPhrase(c: Country, locale: Locale): string | null {
  if (!c.capital) return null;
  return locale === "de" ? `Die Hauptstadt ist ${c.capital}.` : `Its capital is ${c.capital}.`;
}

function neighbourPhrase(c: Country, locale: Locale): string | null {
  if (!c.borders.length) return null;
  const names = c.borders
    .map((b) => getCountryByCca3(b))
    .filter(Boolean)
    .map((n) => (locale === "de" ? n!.name.de : n!.name.en));
  if (!names.length) return null;
  const sample = names.slice(0, 2).join(locale === "de" ? " und " : " and ");
  return locale === "de" ? `Zu seinen Nachbarn zählt ${sample}.` : `Its neighbours include ${sample}.`;
}

/** Iconic dishes by cca3 — used as a culture clue and post-answer fact. */
const FOODS: Record<string, string> = {
  AFG: "Kabuli Pulao", ALB: "Tavë kosi", DZA: "Couscous", AGO: "Muamba de galinha",
  ARG: "Asado", ARM: "Khorovats", AUS: "Meat pie", AUT: "Wiener Schnitzel",
  AZE: "Plov", BHS: "Conch salad", BHR: "Machboos", BGD: "Hilsa curry",
  BRB: "Cou-cou and flying fish", BLR: "Draniki", BEL: "Moules-frites", BTN: "Ema datshi",
  BOL: "Salteñas", BIH: "Ćevapi", BWA: "Seswaa", BRA: "Feijoada", BGR: "Banitsa",
  KHM: "Fish amok", CMR: "Ndolé", CAN: "Poutine", CPV: "Cachupa", CHL: "Empanadas",
  CHN: "Peking duck", COL: "Bandeja paisa", COG: "Poulet moambé", COD: "Moambe",
  CRI: "Gallo pinto", CIV: "Attiéké", HRV: "Peka", CUB: "Ropa vieja", CYP: "Halloumi",
  CZE: "Svíčková", DNK: "Smørrebrød", DOM: "La bandera", ECU: "Ceviche", EGY: "Koshari",
  SLV: "Pupusas", ERI: "Zigni", EST: "Verivorst", ETH: "Injera", FJI: "Kokoda",
  FIN: "Karjalanpiirakka", FRA: "Coq au vin", GMB: "Domoda", GEO: "Khachapuri",
  DEU: "Bratwurst", GHA: "Jollof rice", GRC: "Moussaka", GTM: "Pepián", GUY: "Pepperpot",
  HTI: "Griot", HND: "Baleadas", HUN: "Goulash", ISL: "Plokkfiskur", IND: "Biryani",
  IDN: "Nasi goreng", IRN: "Chelo kabab", IRQ: "Masgouf", IRL: "Irish stew",
  ISR: "Falafel", ITA: "Pizza", JAM: "Ackee and saltfish", JPN: "Sushi", JOR: "Mansaf",
  KAZ: "Beshbarmak", KEN: "Nyama choma", KOR: "Kimchi", KWT: "Machboos", KGZ: "Beshbarmak",
  LAO: "Larb", LBN: "Tabbouleh", LTU: "Cepelinai", LUX: "Judd mat Gaardebounen",
  MDG: "Romazava", MWI: "Nsima", MYS: "Nasi lemak", MDV: "Garudhiya", MLT: "Pastizzi",
  MUS: "Dholl puri", MEX: "Tacos", MDA: "Mămăligă", MNG: "Buuz", MAR: "Tagine",
  MOZ: "Piri-piri chicken", MMR: "Mohinga", NPL: "Dal bhat", NLD: "Stamppot",
  NZL: "Hāngī", NIC: "Gallo pinto", NGA: "Egusi soup", NOR: "Lutefisk", OMN: "Shuwa",
  PAK: "Nihari", PAN: "Sancocho", PRY: "Sopa paraguaya", PER: "Ceviche", PHL: "Adobo",
  POL: "Pierogi", PRT: "Bacalhau", QAT: "Machboos", ROU: "Sarmale", RUS: "Borscht",
  SAU: "Kabsa", SEN: "Thieboudienne", SRB: "Ćevapi", SGP: "Hainanese chicken rice",
  SVK: "Bryndzové halušky", SVN: "Potica", ZAF: "Bobotie", ESP: "Paella",
  LKA: "Rice and curry", SUR: "Pom", SWE: "Köttbullar", CHE: "Fondue", SYR: "Kibbeh",
  TWN: "Beef noodle soup", TJK: "Qurutob", TZA: "Ugali", THA: "Pad Thai", TTO: "Doubles",
  TUN: "Couscous", TUR: "Kebab", TKM: "Plov", UGA: "Matoke", UKR: "Borscht",
  ARE: "Shawarma", GBR: "Fish and chips", USA: "Hamburger", URY: "Chivito", UZB: "Plov",
  VEN: "Arepas", VNM: "Phở", YEM: "Mandi", ZMB: "Nshima", ZWE: "Sadza",
};

function foodPhrase(c: Country, locale: Locale): string | null {
  const dish = FOODS[c.cca3];
  if (!dish) return null;
  return locale === "de" ? `Ein berühmtes Gericht ist ${dish}.` : `A famous dish here is ${dish}.`;
}

function sizeRankPhrase(c: Country, locale: Locale): string | null {
  if (c.area >= 2_500_000) {
    return locale === "de" ? "Eines der größten Länder der Welt." : "One of the world's largest countries.";
  }
  if (c.area > 0 && c.area <= 1000) {
    return locale === "de" ? "Eines der kleinsten Länder der Welt." : "One of the world's smallest countries.";
  }
  return null;
}

function densityPhrase(c: Country, locale: Locale): string | null {
  if (c.area <= 0 || !c.population) return null;
  const d = c.population / c.area;
  if (d >= 300) return locale === "de" ? "Sehr dicht besiedelt." : "Very densely populated.";
  if (d <= 12) return locale === "de" ? "Sehr dünn besiedelt." : "Very sparsely populated.";
  return null;
}

function islandPhrase(c: Country, locale: Locale): string | null {
  if (c.borders.length === 0 && !c.landlocked) {
    return locale === "de" ? "Ein Inselstaat." : "An island nation.";
  }
  return null;
}

function languagesPhrase(c: Country, locale: Locale): string | null {
  if (!c.languages.length) return null;
  const langs = c.languages.slice(0, 2).join(locale === "de" ? " und " : " and ");
  return locale === "de" ? `Hier spricht man ${langs}.` : `People here speak ${langs}.`;
}

function firstNonNull(gens: Array<() => string | null>): string | null {
  for (const g of shuffle(gens)) {
    const v = g();
    if (v) return v;
  }
  return null;
}

/**
 * Four escalating clues for the Trivia game, from vague to easy:
 *   1) continent  2) a distinctive stat  3) a culture clue (dish/language/currency)
 *   4) the capital city (near give-away, so the round is always solvable).
 */
export function triviaClues(c: Country, locale: Locale): string[] {
  // Each tier picks randomly among several categories for variety, while the
  // overall order escalates from vague (continent) to easy (capital).
  const tier1 = firstNonNull([
    () => (locale === "de" ? `Liegt in ${regionName(c, locale)}.` : `Located in ${regionName(c, locale)}.`),
    () => sizeRankPhrase(c, locale),
    () => hemispherePhrase(c, locale),
    () => islandPhrase(c, locale),
  ]);
  const tier2 = firstNonNull([
    () => populationPhrase(c, locale),
    () => areaPhrase(c, locale),
    () => bordersPhrase(c, locale),
    () => landlockedPhrase(c, locale),
    () => densityPhrase(c, locale),
    () => (locale === "de" ? `Region: ${subregionName(c, locale)}.` : `Subregion: ${subregionName(c, locale)}.`),
  ]);
  const tier3 = firstNonNull([
    () => foodPhrase(c, locale),
    () => languagesPhrase(c, locale),
    () => currencyPhrase(c, locale),
    () => neighbourPhrase(c, locale),
  ]);
  // Build the first three clues, backfilling so we have three distinct ones…
  const core: string[] = [tier1, tier2, tier3].filter((x): x is string => !!x);
  const extras = [
    populationPhrase(c, locale),
    areaPhrase(c, locale),
    foodPhrase(c, locale),
    currencyPhrase(c, locale),
    languagesPhrase(c, locale),
    bordersPhrase(c, locale),
  ];
  for (const e of extras) {
    if (core.length >= 3) break;
    if (e && !core.includes(e)) core.push(e);
  }
  // …then the capital as the final, easiest clue so the round is solvable.
  const giveaway = capitalPhrase(c, locale) ?? neighbourPhrase(c, locale) ?? currencyPhrase(c, locale);
  const ordered = Array.from(new Set(core)).slice(0, 3);
  if (giveaway && !ordered.includes(giveaway)) ordered.push(giveaway);
  return ordered;
}

/** A single interesting fact for display after a correct answer (may include capital). */
export function randomFact(c: Country, locale: Locale): string {
  // Prefer a hand-curated "cool" fact most of the time when one exists.
  const curated = COUNTRY_FACTS[c.cca3];
  if (curated && curated.length && Math.random() < 0.75) {
    return pickOne(curated)[locale];
  }
  const pool = [
    foodPhrase(c, locale),
    capitalPhrase(c, locale),
    populationPhrase(c, locale),
    areaPhrase(c, locale),
    languagePhrase(c, locale),
    currencyPhrase(c, locale),
    landlockedPhrase(c, locale),
    neighbourPhrase(c, locale),
    hemispherePhrase(c, locale),
    locale === "de" ? `Liegt in ${subregionName(c, locale)}.` : `Located in ${subregionName(c, locale)}.`,
  ].filter((x): x is string => !!x);
  return pool.length ? pickOne(pool) : "";
}
