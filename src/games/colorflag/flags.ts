/**
 * Layout-based flag specs for "Color the Flag".
 * Only simple geometric flags (stripes / Nordic crosses) are included, so every
 * fillable area is a real solid colour field — no crests or emblems to worry about.
 */

export type ColorKey = "red" | "blue" | "lightblue" | "white" | "green" | "yellow" | "black" | "orange";

/** Canonical flag colours; one hex per concept so swatch options are clearly distinct. */
export const PALETTE: Record<ColorKey, string> = {
  red: "#ce1126",
  blue: "#0055a4",
  lightblue: "#5eb6e4",
  white: "#ffffff",
  green: "#009639",
  yellow: "#ffcc00",
  black: "#000000",
  orange: "#ff7900",
};

export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

export type Layout =
  | { kind: "vbars"; colors: ColorKey[] }
  | { kind: "hbars"; colors: ColorKey[] }
  | { kind: "cross"; field: ColorKey; cross: ColorKey };

export interface ColorFlag {
  cca3: string;
  en: string;
  de: string;
  layout: Layout;
}

export const COLOR_FLAGS: ColorFlag[] = [
  // Vertical tricolours
  { cca3: "FRA", en: "France", de: "Frankreich", layout: { kind: "vbars", colors: ["blue", "white", "red"] } },
  { cca3: "ITA", en: "Italy", de: "Italien", layout: { kind: "vbars", colors: ["green", "white", "red"] } },
  { cca3: "IRL", en: "Ireland", de: "Irland", layout: { kind: "vbars", colors: ["green", "white", "orange"] } },
  { cca3: "BEL", en: "Belgium", de: "Belgien", layout: { kind: "vbars", colors: ["black", "yellow", "red"] } },
  { cca3: "ROU", en: "Romania", de: "Rumänien", layout: { kind: "vbars", colors: ["blue", "yellow", "red"] } },
  { cca3: "NGA", en: "Nigeria", de: "Nigeria", layout: { kind: "vbars", colors: ["green", "white", "green"] } },
  { cca3: "PER", en: "Peru", de: "Peru", layout: { kind: "vbars", colors: ["red", "white", "red"] } },
  { cca3: "CIV", en: "Côte d'Ivoire", de: "Elfenbeinküste", layout: { kind: "vbars", colors: ["orange", "white", "green"] } },
  { cca3: "GIN", en: "Guinea", de: "Guinea", layout: { kind: "vbars", colors: ["red", "yellow", "green"] } },
  { cca3: "MLI", en: "Mali", de: "Mali", layout: { kind: "vbars", colors: ["green", "yellow", "red"] } },

  // Horizontal tricolours
  { cca3: "DEU", en: "Germany", de: "Deutschland", layout: { kind: "hbars", colors: ["black", "red", "yellow"] } },
  { cca3: "NLD", en: "Netherlands", de: "Niederlande", layout: { kind: "hbars", colors: ["red", "white", "blue"] } },
  { cca3: "RUS", en: "Russia", de: "Russland", layout: { kind: "hbars", colors: ["white", "blue", "red"] } },
  { cca3: "AUT", en: "Austria", de: "Österreich", layout: { kind: "hbars", colors: ["red", "white", "red"] } },
  { cca3: "HUN", en: "Hungary", de: "Ungarn", layout: { kind: "hbars", colors: ["red", "white", "green"] } },
  { cca3: "BGR", en: "Bulgaria", de: "Bulgarien", layout: { kind: "hbars", colors: ["white", "green", "red"] } },
  { cca3: "LTU", en: "Lithuania", de: "Litauen", layout: { kind: "hbars", colors: ["yellow", "green", "red"] } },
  { cca3: "GAB", en: "Gabon", de: "Gabun", layout: { kind: "hbars", colors: ["green", "yellow", "blue"] } },
  { cca3: "YEM", en: "Yemen", de: "Jemen", layout: { kind: "hbars", colors: ["red", "white", "black"] } },
  { cca3: "EST", en: "Estonia", de: "Estland", layout: { kind: "hbars", colors: ["blue", "black", "white"] } },
  { cca3: "SLE", en: "Sierra Leone", de: "Sierra Leone", layout: { kind: "hbars", colors: ["green", "white", "blue"] } },
  { cca3: "COL", en: "Colombia", de: "Kolumbien", layout: { kind: "hbars", colors: ["yellow", "blue", "red"] } },

  // Bicolours
  { cca3: "IDN", en: "Indonesia", de: "Indonesien", layout: { kind: "hbars", colors: ["red", "white"] } },
  { cca3: "POL", en: "Poland", de: "Polen", layout: { kind: "hbars", colors: ["white", "red"] } },
  { cca3: "UKR", en: "Ukraine", de: "Ukraine", layout: { kind: "hbars", colors: ["blue", "yellow"] } },
  { cca3: "MCO", en: "Monaco", de: "Monaco", layout: { kind: "hbars", colors: ["red", "white"] } },

  // Five stripes
  { cca3: "THA", en: "Thailand", de: "Thailand", layout: { kind: "hbars", colors: ["red", "white", "blue", "white", "red"] } },

  // Nordic crosses
  { cca3: "DNK", en: "Denmark", de: "Dänemark", layout: { kind: "cross", field: "red", cross: "white" } },
  { cca3: "FIN", en: "Finland", de: "Finnland", layout: { kind: "cross", field: "white", cross: "blue" } },
  { cca3: "SWE", en: "Sweden", de: "Schweden", layout: { kind: "cross", field: "blue", cross: "yellow" } },
];

export interface Region {
  /** Correct colour for this fillable area. */
  color: ColorKey;
  rects: { x: number; y: number; w: number; h: number }[];
}

const W = 60;
const H = 40;

/** Turn a layout into drawable, fillable regions (viewBox 0 0 60 40). */
export function regionsFor(layout: Layout): Region[] {
  if (layout.kind === "vbars") {
    const w = W / layout.colors.length;
    return layout.colors.map((color, i) => ({ color, rects: [{ x: i * w, y: 0, w, h: H }] }));
  }
  if (layout.kind === "hbars") {
    const h = H / layout.colors.length;
    return layout.colors.map((color, i) => ({ color, rects: [{ x: 0, y: i * h, w: W, h }] }));
  }
  // Nordic cross: field + an offset cross.
  const vx = 18;
  const vw = 8;
  const hy = 16;
  const hh = 8;
  return [
    { color: layout.field, rects: [{ x: 0, y: 0, w: W, h: H }] },
    {
      color: layout.cross,
      rects: [
        { x: vx, y: 0, w: vw, h: H },
        { x: 0, y: hy, w: W, h: hh },
      ],
    },
  ];
}

export const FLAG_VIEWBOX = { W, H };

export function flagName(f: ColorFlag, locale: "en" | "de"): string {
  return locale === "de" ? f.de : f.en;
}
