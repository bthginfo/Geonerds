import type { Locale } from "./types";

const SUBREGIONS_DE: Record<string, string> = {
  "Northern Africa": "Nordafrika", "Sub-Saharan Africa": "Subsahara-Afrika",
  "Eastern Africa": "Ostafrika", "Middle Africa": "Zentralafrika", "Southern Africa": "Südafrika", "Western Africa": "Westafrika",
  "Northern America": "Nordamerika", "Central America": "Mittelamerika", "South America": "Südamerika", Caribbean: "der Karibik",
  "Central Asia": "Zentralasien", "Eastern Asia": "Ostasien", "South-Eastern Asia": "Südostasien", "Southern Asia": "Südasien", "Western Asia": "Westasien",
  "Eastern Europe": "Osteuropa", "Northern Europe": "Nordeuropa", "Southern Europe": "Südeuropa", "Western Europe": "Westeuropa",
  "Australia and New Zealand": "Australien und Neuseeland", Melanesia: "Melanesien", Micronesia: "Mikronesien", Polynesia: "Polynesien",
};

export function subregionLabel(value: string, locale: Locale): string {
  return locale === "de" ? SUBREGIONS_DE[value] ?? value : value;
}
