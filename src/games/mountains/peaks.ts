export interface Peak {
  en: string;
  de: string;
  lat: number;
  lng: number;
  kind: "mountain" | "volcano";
  /** 1 = famous, 2 = medium, 3 = obscure. */
  tier: 1 | 2 | 3;
  aliases?: string[];
}

export const PEAKS: Peak[] = [
  { en: "Mount Everest", de: "Mount Everest", lat: 27.9881, lng: 86.925, kind: "mountain", tier: 1, aliases: ["Everest", "Sagarmatha", "Chomolungma"] },
  { en: "Kilimanjaro", de: "Kilimandscharo", lat: -3.0674, lng: 37.3556, kind: "volcano", tier: 1, aliases: ["Mount Kilimanjaro"] },
  { en: "Mont Blanc", de: "Montblanc", lat: 45.8326, lng: 6.8652, kind: "mountain", tier: 1 },
  { en: "Matterhorn", de: "Matterhorn", lat: 45.9763, lng: 7.6586, kind: "mountain", tier: 1, aliases: ["Monte Cervino"] },
  { en: "Mount Fuji", de: "Fuji", lat: 35.3606, lng: 138.7274, kind: "volcano", tier: 1, aliases: ["Fujisan", "Fudschijama", "Fudži"] },
  { en: "Mount Vesuvius", de: "Vesuv", lat: 40.821, lng: 14.426, kind: "volcano", tier: 1, aliases: ["Vesuvius", "Vesuvio"] },
  { en: "Mount Etna", de: "Ätna", lat: 37.751, lng: 14.993, kind: "volcano", tier: 1, aliases: ["Etna"] },
  { en: "K2", de: "K2", lat: 35.8825, lng: 76.5133, kind: "mountain", tier: 2, aliases: ["Mount Godwin-Austen", "Chhogori"] },
  { en: "Denali", de: "Denali", lat: 63.0692, lng: -151.007, kind: "mountain", tier: 2, aliases: ["Mount McKinley"] },
  { en: "Aconcagua", de: "Aconcagua", lat: -32.6532, lng: -70.0109, kind: "mountain", tier: 2 },
  { en: "Mount Elbrus", de: "Elbrus", lat: 43.355, lng: 42.439, kind: "mountain", tier: 2, aliases: ["Elbrus"] },
  { en: "Mount Rainier", de: "Mount Rainier", lat: 46.852, lng: -121.76, kind: "volcano", tier: 2 },
  { en: "Mauna Loa", de: "Mauna Loa", lat: 19.479, lng: -155.603, kind: "volcano", tier: 2 },
  { en: "Krakatoa", de: "Krakatau", lat: -6.102, lng: 105.423, kind: "volcano", tier: 2, aliases: ["Krakatau"] },
  { en: "Mount St. Helens", de: "Mount St. Helens", lat: 46.191, lng: -122.196, kind: "volcano", tier: 2, aliases: ["St Helens"] },
  { en: "Popocatépetl", de: "Popocatépetl", lat: 19.023, lng: -98.622, kind: "volcano", tier: 2, aliases: ["Popocatepetl"] },
  { en: "Mount Teide", de: "Teide", lat: 28.272, lng: -16.642, kind: "volcano", tier: 2, aliases: ["Teide", "Pico del Teide"] },
  { en: "Zugspitze", de: "Zugspitze", lat: 47.421, lng: 10.985, kind: "mountain", tier: 2 },
  { en: "Mount Olympus", de: "Olymp", lat: 40.085, lng: 22.358, kind: "mountain", tier: 2, aliases: ["Olympus", "Olymp"] },
  { en: "Table Mountain", de: "Tafelberg", lat: -33.957, lng: 18.403, kind: "mountain", tier: 2, aliases: ["Tafelberg"] },
  { en: "Mount Kosciuszko", de: "Mount Kosciuszko", lat: -36.456, lng: 148.263, kind: "mountain", tier: 2, aliases: ["Kosciuszko", "Kosciusko"] },
  { en: "Ben Nevis", de: "Ben Nevis", lat: 56.797, lng: -5.003, kind: "mountain", tier: 3 },
  { en: "Eiger", de: "Eiger", lat: 46.577, lng: 8.005, kind: "mountain", tier: 3 },
  { en: "Cotopaxi", de: "Cotopaxi", lat: -0.684, lng: -78.437, kind: "volcano", tier: 3 },
  { en: "Chimborazo", de: "Chimborazo", lat: -1.469, lng: -78.817, kind: "mountain", tier: 3 },
  { en: "Nanga Parbat", de: "Nanga Parbat", lat: 35.237, lng: 74.589, kind: "mountain", tier: 3 },
  { en: "Annapurna", de: "Annapurna", lat: 28.596, lng: 83.82, kind: "mountain", tier: 3 },
  { en: "Mount Ararat", de: "Ararat", lat: 39.702, lng: 44.298, kind: "volcano", tier: 3, aliases: ["Ararat"] },
  { en: "Mount Cook", de: "Mount Cook", lat: -43.595, lng: 170.141, kind: "mountain", tier: 3, aliases: ["Aoraki"] },
  { en: "Pico de Orizaba", de: "Pico de Orizaba", lat: 19.03, lng: -97.268, kind: "volcano", tier: 3, aliases: ["Citlaltépetl"] },
  { en: "Mount Erebus", de: "Mount Erebus", lat: -77.529, lng: 167.153, kind: "volcano", tier: 3, aliases: ["Erebus"] },
  { en: "Stromboli", de: "Stromboli", lat: 38.789, lng: 15.213, kind: "volcano", tier: 3 },
  { en: "Eyjafjallajökull", de: "Eyjafjallajökull", lat: 63.633, lng: -19.602, kind: "volcano", tier: 3 },
  { en: "Mount Damavand", de: "Demawend", lat: 35.955, lng: 52.109, kind: "volcano", tier: 3, aliases: ["Damavand", "Demawend"] },
  { en: "Mount Whitney", de: "Mount Whitney", lat: 36.578, lng: -118.292, kind: "mountain", tier: 3 },
  { en: "Mount Sinai", de: "Sinai", lat: 28.539, lng: 33.973, kind: "mountain", tier: 3, aliases: ["Sinai"] },
  // ── Europe ──
  { en: "Jungfrau", de: "Jungfrau", lat: 46.537, lng: 7.962, kind: "mountain", tier: 3 },
  { en: "Großglockner", de: "Großglockner", lat: 47.074, lng: 12.694, kind: "mountain", tier: 3, aliases: ["Grossglockner"] },
  { en: "Triglav", de: "Triglav", lat: 46.378, lng: 13.837, kind: "mountain", tier: 3 },
  { en: "Mulhacén", de: "Mulhacén", lat: 37.053, lng: -3.311, kind: "mountain", tier: 3, aliases: ["Mulhacen"] },
  { en: "Snowdon", de: "Snowdon", lat: 53.068, lng: -4.076, kind: "mountain", tier: 3, aliases: ["Yr Wyddfa"] },
  { en: "Galdhøpiggen", de: "Galdhøpiggen", lat: 61.636, lng: 8.313, kind: "mountain", tier: 3, aliases: ["Galdhopiggen"] },
  { en: "Kebnekaise", de: "Kebnekaise", lat: 67.901, lng: 18.53, kind: "mountain", tier: 3 },
  { en: "Hekla", de: "Hekla", lat: 63.992, lng: -19.665, kind: "volcano", tier: 3 },
  // ── North & Central America ──
  { en: "Mauna Kea", de: "Mauna Kea", lat: 19.821, lng: -155.468, kind: "volcano", tier: 2 },
  { en: "Mount Shasta", de: "Mount Shasta", lat: 41.409, lng: -122.195, kind: "volcano", tier: 3 },
  { en: "Mount Hood", de: "Mount Hood", lat: 45.374, lng: -121.696, kind: "volcano", tier: 3 },
  { en: "Grand Teton", de: "Grand Teton", lat: 43.741, lng: -110.802, kind: "mountain", tier: 3 },
  { en: "Mount Logan", de: "Mount Logan", lat: 60.567, lng: -140.405, kind: "mountain", tier: 3 },
  { en: "Iztaccíhuatl", de: "Iztaccíhuatl", lat: 19.179, lng: -98.642, kind: "volcano", tier: 3, aliases: ["Iztaccihuatl"] },
  { en: "Tajumulco", de: "Tajumulco", lat: 15.043, lng: -91.903, kind: "volcano", tier: 3 },
  { en: "Arenal", de: "Arenal", lat: 10.463, lng: -84.703, kind: "volcano", tier: 3, aliases: ["Volcán Arenal"] },
  // ── South America ──
  { en: "Ojos del Salado", de: "Ojos del Salado", lat: -27.109, lng: -68.541, kind: "volcano", tier: 3 },
  { en: "Huascarán", de: "Huascarán", lat: -9.121, lng: -77.604, kind: "mountain", tier: 3, aliases: ["Huascaran"] },
  { en: "Nevado del Ruiz", de: "Nevado del Ruiz", lat: 4.892, lng: -75.324, kind: "volcano", tier: 3 },
  { en: "Villarrica", de: "Villarrica", lat: -39.42, lng: -71.93, kind: "volcano", tier: 3 },
  { en: "Mount Roraima", de: "Roraima", lat: 5.143, lng: -60.762, kind: "mountain", tier: 3, aliases: ["Roraima"] },
  // ── Africa ──
  { en: "Mount Meru", de: "Mount Meru", lat: -3.247, lng: 36.751, kind: "volcano", tier: 3 },
  { en: "Nyiragongo", de: "Nyiragongo", lat: -1.52, lng: 29.25, kind: "volcano", tier: 3 },
  { en: "Ras Dashen", de: "Ras Daschän", lat: 13.235, lng: 38.367, kind: "mountain", tier: 3, aliases: ["Ras Dejen"] },
  { en: "Toubkal", de: "Toubkal", lat: 31.06, lng: -7.915, kind: "mountain", tier: 3, aliases: ["Jbel Toubkal"] },
  { en: "Mount Cameroon", de: "Kamerunberg", lat: 4.203, lng: 9.17, kind: "volcano", tier: 3 },
  // ── Asia & Oceania ──
  { en: "Mount Kinabalu", de: "Kinabalu", lat: 6.075, lng: 116.558, kind: "mountain", tier: 3 },
  { en: "Mount Pinatubo", de: "Pinatubo", lat: 15.143, lng: 120.349, kind: "volcano", tier: 3 },
  { en: "Mayon", de: "Mayon", lat: 13.257, lng: 123.685, kind: "volcano", tier: 3, aliases: ["Mount Mayon"] },
  { en: "Mount Bromo", de: "Bromo", lat: -7.942, lng: 112.953, kind: "volcano", tier: 3 },
  { en: "Mount Merapi", de: "Merapi", lat: -7.54, lng: 110.446, kind: "volcano", tier: 3 },
  { en: "Mount Agung", de: "Agung", lat: -8.343, lng: 115.508, kind: "volcano", tier: 3 },
  { en: "Mount Paektu", de: "Paektusan", lat: 41.993, lng: 128.077, kind: "volcano", tier: 3, aliases: ["Baekdu", "Changbaishan"] },
  { en: "Mount Aso", de: "Aso", lat: 32.884, lng: 131.104, kind: "volcano", tier: 3 },
  { en: "Puncak Jaya", de: "Puncak Jaya", lat: -4.078, lng: 137.158, kind: "mountain", tier: 3, aliases: ["Carstensz Pyramid", "Carstensz-Pyramide"] },
  { en: "Mount Wilhelm", de: "Mount Wilhelm", lat: -5.795, lng: 145.029, kind: "mountain", tier: 3 },
];

export const PEAK_MAX_TIER: Record<"easy" | "medium" | "hard", number> = {
  easy: 1,
  medium: 2,
  hard: 3,
};

export function peakName(p: Peak, locale: "en" | "de"): string {
  return locale === "de" ? p.de : p.en;
}

export function peakAccepted(p: Peak): string[] {
  return Array.from(new Set([p.en, p.de, ...(p.aliases ?? [])]));
}
