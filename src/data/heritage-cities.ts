/** Approximate historic-town reference points, rounded from UNESCO site
 * coordinates. These are point-game targets, never municipal boundaries.
 * Capitals are deliberately excluded: Compass already has their exact records.
 */
export const HERITAGE_CITIES = [
  { en: "Visby", de: "Visby", cca3: "SWE", lat: 57.64167, lng: 18.29583, source: "https://whc.unesco.org/en/list/731/" },
  { en: "Rauma", de: "Rauma", cca3: "FIN", lat: 61.12806, lng: 21.51167, source: "https://whc.unesco.org/en/list/582/" },
  { en: "Bardejov", de: "Bardejov", cca3: "SVK", lat: 49.29278, lng: 21.27556, source: "https://whc.unesco.org/en/list/973/" },
  { en: "Mostar", de: "Mostar", cca3: "BIH", lat: 43.33731, lng: 17.815, source: "https://whc.unesco.org/en/list/946/" },
  { en: "Fray Bentos", de: "Fray Bentos", cca3: "URY", lat: -33.11778, lng: -58.33167, source: "https://whc.unesco.org/en/list/1464/" },
  { en: "Colonia del Sacramento", de: "Colonia del Sacramento", cca3: "URY", lat: -34.47119, lng: -57.8499, source: "https://whc.unesco.org/en/list/747/" },
  { en: "Zacatecas", de: "Zacatecas", cca3: "MEX", lat: 22.77548, lng: -102.57353, source: "https://whc.unesco.org/en/list/676/" },
  { en: "Cienfuegos", de: "Cienfuegos", cca3: "CUB", lat: 22.14589, lng: -80.45218, source: "https://whc.unesco.org/en/list/1202/" },
  { en: "Levuka", de: "Levuka", cca3: "FJI", lat: -17.68338, lng: 178.83453, source: "https://whc.unesco.org/en/list/1399/" },
  { en: "Cidade Velha", de: "Cidade Velha", cca3: "CPV", lat: 14.91514, lng: -23.60519, source: "https://whc.unesco.org/en/list/1310/" },
] as const;
