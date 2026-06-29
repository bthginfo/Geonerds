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
