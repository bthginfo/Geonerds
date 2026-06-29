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
  | { kind: "cross"; field: ColorKey; cross: ColorKey }
  // Vertical hoist bar (left) + horizontal bands on the right (e.g. UAE).
  | { kind: "barLeft"; bar: ColorKey; colors: ColorKey[] }
  // Solid field with a centred star (e.g. Vietnam, Somalia, Morocco).
  | { kind: "fieldStar"; field: ColorKey; star: ColorKey }
  // Horizontal bands with a centred star (e.g. Myanmar, Ghana).
  | { kind: "barsStar"; colors: ColorKey[]; star: ColorKey }
  // Vertical bands with a centred star (e.g. Senegal, Cameroon).
  | { kind: "vbarsStar"; colors: ColorKey[]; star: ColorKey }
  // Solid field with a cluster of stars in the upper hoist (China).
  | { kind: "cantonStars"; field: ColorKey; star: ColorKey }
  // Diagonal saltire dividing into four triangles (Jamaica).
  | { kind: "saltire"; saltire: ColorKey; topBottom: ColorKey; leftRight: ColorKey };

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

  // ── More tricolours & bicolours ──
  { cca3: "LUX", en: "Luxembourg", de: "Luxemburg", layout: { kind: "hbars", colors: ["red", "white", "lightblue"] } },
  { cca3: "ARM", en: "Armenia", de: "Armenien", layout: { kind: "hbars", colors: ["red", "blue", "orange"] } },
  { cca3: "BOL", en: "Bolivia", de: "Bolivien", layout: { kind: "hbars", colors: ["red", "yellow", "green"] } },
  { cca3: "ECU", en: "Ecuador", de: "Ecuador", layout: { kind: "hbars", colors: ["yellow", "blue", "red"] } },
  { cca3: "TCD", en: "Chad", de: "Tschad", layout: { kind: "vbars", colors: ["blue", "yellow", "red"] } },
  { cca3: "SMR", en: "San Marino", de: "San Marino", layout: { kind: "hbars", colors: ["white", "lightblue"] } },
  { cca3: "MUS", en: "Mauritius", de: "Mauritius", layout: { kind: "hbars", colors: ["red", "blue", "yellow", "green"] } },
  { cca3: "CRI", en: "Costa Rica", de: "Costa Rica", layout: { kind: "hbars", colors: ["blue", "white", "red", "white", "blue"] } },
  { cca3: "GMB", en: "Gambia", de: "Gambia", layout: { kind: "hbars", colors: ["red", "white", "blue", "white", "green"] } },

  // ── Flags with a simple symbol (the symbol is a fillable area too) ──
  { cca3: "ARE", en: "United Arab Emirates", de: "Vereinigte Arabische Emirate", layout: { kind: "barLeft", bar: "red", colors: ["green", "white", "black"] } },
  { cca3: "VNM", en: "Vietnam", de: "Vietnam", layout: { kind: "fieldStar", field: "red", star: "yellow" } },
  { cca3: "SOM", en: "Somalia", de: "Somalia", layout: { kind: "fieldStar", field: "lightblue", star: "white" } },
  { cca3: "MAR", en: "Morocco", de: "Marokko", layout: { kind: "fieldStar", field: "red", star: "green" } },
  { cca3: "CHN", en: "China", de: "China", layout: { kind: "cantonStars", field: "red", star: "yellow" } },
  { cca3: "MMR", en: "Myanmar", de: "Myanmar", layout: { kind: "barsStar", colors: ["yellow", "green", "red"], star: "white" } },
  { cca3: "GHA", en: "Ghana", de: "Ghana", layout: { kind: "barsStar", colors: ["red", "yellow", "green"], star: "black" } },
  { cca3: "SEN", en: "Senegal", de: "Senegal", layout: { kind: "vbarsStar", colors: ["green", "yellow", "red"], star: "green" } },
  { cca3: "CMR", en: "Cameroon", de: "Kamerun", layout: { kind: "vbarsStar", colors: ["green", "red", "yellow"], star: "yellow" } },
  { cca3: "JAM", en: "Jamaica", de: "Jamaika", layout: { kind: "saltire", saltire: "yellow", topBottom: "green", leftRight: "black" } },
];

export type Shape = { t: "rect"; x: number; y: number; w: number; h: number } | { t: "path"; d: string };

export interface Region {
  /** Correct colour for this fillable area. */
  color: ColorKey;
  shapes: Shape[];
}

const W = 60;
const H = 40;

function rect(x: number, y: number, w: number, h: number): Shape {
  return { t: "rect", x, y, w, h };
}

/** Five-pointed star path centred at (cx, cy), pointing up. */
function star(cx: number, cy: number, outer: number, inner = outer * 0.4): Shape {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const ao = (-90 + i * 72) * (Math.PI / 180);
    const ai = ao + Math.PI / 5;
    const ox = cx + outer * Math.cos(ao);
    const oy = cy + outer * Math.sin(ao);
    const ix = cx + inner * Math.cos(ai);
    const iy = cy + inner * Math.sin(ai);
    d += `${i === 0 ? "M" : "L"}${ox.toFixed(2)} ${oy.toFixed(2)}L${ix.toFixed(2)} ${iy.toFixed(2)}`;
  }
  return { t: "path", d: d + "Z" };
}

/** Turn a layout into drawable, fillable regions (viewBox 0 0 60 40). */
export function regionsFor(layout: Layout): Region[] {
  switch (layout.kind) {
    case "vbars": {
      const w = W / layout.colors.length;
      return layout.colors.map((color, i) => ({ color, shapes: [rect(i * w, 0, w, H)] }));
    }
    case "hbars": {
      const h = H / layout.colors.length;
      return layout.colors.map((color, i) => ({ color, shapes: [rect(0, i * h, W, h)] }));
    }
    case "cross":
      return [
        { color: layout.field, shapes: [rect(0, 0, W, H)] },
        { color: layout.cross, shapes: [rect(18, 0, 8, H), rect(0, 16, W, 8)] },
      ];
    case "barLeft": {
      const bx = W * 0.25;
      const bw = W - bx;
      const h = H / layout.colors.length;
      return [
        { color: layout.bar, shapes: [rect(0, 0, bx, H)] },
        ...layout.colors.map((color, i) => ({ color, shapes: [rect(bx, i * h, bw, h)] })),
      ];
    }
    case "fieldStar":
      return [
        { color: layout.field, shapes: [rect(0, 0, W, H)] },
        { color: layout.star, shapes: [star(W / 2, H / 2, 9)] },
      ];
    case "barsStar": {
      const h = H / layout.colors.length;
      return [
        ...layout.colors.map((color, i) => ({ color, shapes: [rect(0, i * h, W, h)] })),
        { color: layout.star, shapes: [star(W / 2, H / 2, 8)] },
      ];
    }
    case "vbarsStar": {
      const w = W / layout.colors.length;
      return [
        ...layout.colors.map((color, i) => ({ color, shapes: [rect(i * w, 0, w, H)] })),
        { color: layout.star, shapes: [star(W / 2, H / 2, 8)] },
      ];
    }
    case "cantonStars": {
      const stars: Shape[] = [
        star(11, 9, 5),
        star(19.5, 4.5, 1.7),
        star(22, 8.5, 1.7),
        star(22, 13.5, 1.7),
        star(19.5, 17.5, 1.7),
      ];
      return [
        { color: layout.field, shapes: [rect(0, 0, W, H)] },
        { color: layout.star, shapes: stars },
      ];
    }
    case "saltire": {
      const top: Shape = { t: "path", d: `M0 0 L${W} 0 L${W / 2} ${H / 2} Z` };
      const bottom: Shape = { t: "path", d: `M0 ${H} L${W} ${H} L${W / 2} ${H / 2} Z` };
      const left: Shape = { t: "path", d: `M0 0 L0 ${H} L${W / 2} ${H / 2} Z` };
      const right: Shape = { t: "path", d: `M${W} 0 L${W} ${H} L${W / 2} ${H / 2} Z` };
      const diag1: Shape = { t: "path", d: "M-1.9 2.9 L1.9 -2.9 L61.9 37.1 L58.1 42.9 Z" };
      const diag2: Shape = { t: "path", d: "M58.1 -2.9 L61.9 2.9 L1.9 42.9 L-1.9 37.1 Z" };
      return [
        { color: layout.topBottom, shapes: [top, bottom] },
        { color: layout.leftRight, shapes: [left, right] },
        { color: layout.saltire, shapes: [diag1, diag2] },
      ];
    }
  }
}

export const FLAG_VIEWBOX = { W, H };

export function flagName(f: ColorFlag, locale: "en" | "de"): string {
  return locale === "de" ? f.de : f.en;
}
